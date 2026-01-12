'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  Priority,
  PriorityWithAssignments,
  PriorityAssignment,
  PriorityProgressLog,
  PriorityCriteria,
} from '@/types/priorities'

// ========================================
// FETCH FUNCTIONS
// ========================================

/**
 * Get active priorities assigned to current user
 */
export async function getUserActivePriorities(): Promise<Priority[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  // Use admin client to bypass RLS (user is already validated)
  const { data, error } = await createAdminClient()
    .from('priorities')
    .select(
      `
      *,
      assignments:priority_assignments!inner(user_id)
    `
    )
    .eq('assignments.user_id', user.id)
    .eq('status', 'ativa')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user priorities:', error)
    return []
  }

  return (data || []) as Priority[]
}

/**
 * Get count of active priorities assigned to current user
 */
export async function getUserActivePrioritiesCount(): Promise<number> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return 0

  // Use admin client to bypass RLS (user is already validated)
  const { count, error } = await createAdminClient()
    .from('priorities')
    .select('id, assignments:priority_assignments!inner(user_id)', {
      count: 'exact',
      head: true,
    })
    .eq('assignments.user_id', user.id)
    .eq('status', 'ativa')
    .is('deleted_at', null)

  if (error) {
    console.error('Error counting user priorities:', error)
    return 0
  }

  return count || 0
}

/**
 * Get all priorities (for managers/admins)
 */
export async function getAllPriorities(): Promise<PriorityWithAssignments[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('priorities')
    .select(
      `
      *,
      assignments:priority_assignments(
        id,
        priority_id,
        user_id,
        assigned_at,
        user:users!priority_assignments_user_id_fkey(id, name, email, role)
      ),
      created_by_user:users!priorities_created_by_fkey(id, name, email)
    `
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all priorities:', error)
    return []
  }

  return (data || []) as PriorityWithAssignments[]
}

/**
 * Get single priority by ID
 */
export async function getPriorityById(
  priorityId: string
): Promise<PriorityWithAssignments | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('priorities')
    .select(
      `
      *,
      assignments:priority_assignments(
        id,
        priority_id,
        user_id,
        assigned_at,
        user:users!priority_assignments_user_id_fkey(id, name, email, role)
      ),
      created_by_user:users!priorities_created_by_fkey(id, name, email)
    `
    )
    .eq('id', priorityId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('Error fetching priority:', error)
    return null
  }

  return data as PriorityWithAssignments | null
}

/**
 * Get priority progress log
 */
export async function getPriorityProgressLog(
  priorityId: string
): Promise<PriorityProgressLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('priority_progress_log')
    .select(
      `
      *,
      changed_by_user:users!priority_progress_log_changed_by_fkey(id, name),
      provider:providers(id, name)
    `
    )
    .eq('priority_id', priorityId)
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('Error fetching progress log:', error)
    return []
  }

  return (data || []) as PriorityProgressLog[]
}

// ========================================
// CREATE FUNCTIONS
// ========================================

/**
 * Create a new priority
 */
export async function createPriority(
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean; priorityId?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Utilizador não autenticado' }
    }

    // Check permissions
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (
      !userProfile ||
      !userProfile.role ||
      !['admin', 'manager'].includes(userProfile.role)
    ) {
      return { error: 'Sem permissão para criar prioridades' }
    }

    // Parse form data
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null
    const type = formData.get('type') as string
    const criteriaJson = formData.get('criteria') as string
    const targetValue = parseInt(formData.get('target_value') as string)
    const unit = (formData.get('unit') as string) || 'prestadores'
    const deadline = formData.get('deadline') as string | null
    const urgency = (formData.get('urgency') as string) || 'media'
    const assignedUserIdsJson = formData.get('assigned_users') as string

    // Validate required fields
    if (!title || !type || !targetValue) {
      return { error: 'Campos obrigatórios em falta' }
    }

    const criteria: PriorityCriteria = criteriaJson
      ? JSON.parse(criteriaJson)
      : {}
    const assignedUserIds: string[] = assignedUserIdsJson
      ? JSON.parse(assignedUserIdsJson)
      : []

    // Calculate baseline snapshot
    const baseline = await calculateBaseline(type, criteria)

    // Insert priority
    const { data: priority, error: insertError } = await adminClient
      .from('priorities')
      .insert({
        title,
        description,
        type,
        criteria,
        target_value: targetValue,
        unit,
        deadline: deadline || null,
        urgency,
        created_by: user.id,
        baseline_provider_count: baseline.providerCount,
        baseline_onboarding_count: baseline.onboardingCount,
        calculation_metadata: {
          created_at: new Date().toISOString(),
          criteria,
          type,
        },
      })
      .select()
      .single()

    if (insertError || !priority) {
      console.error('Error creating priority:', insertError)
      return { error: insertError?.message || 'Erro ao criar prioridade' }
    }

    // Assign users
    if (assignedUserIds.length > 0) {
      const assignments = assignedUserIds.map((userId) => ({
        priority_id: priority.id,
        user_id: userId,
        assigned_by: user.id,
      }))

      const { error: assignError } = await adminClient
        .from('priority_assignments')
        .insert(assignments)

      if (assignError) {
        console.error('Error assigning users:', assignError)
        // Non-critical error, priority was created
      } else {
        // Generate alerts for assigned users
        try {
          await generatePriorityCreatedAlert(priority.id, assignedUserIds)
        } catch (err) {
          console.error('Error generating priority created alerts:', err)
        }
      }
    }

    revalidatePath('/prestadores')
    return { success: true, priorityId: priority.id }
  } catch (error) {
    console.error('Unexpected error creating priority:', error)
    return { error: 'Erro inesperado ao criar prioridade' }
  }
}

/**
 * Calculate baseline snapshot (provider/onboarding counts at creation)
 */
async function calculateBaseline(
  type: string,
  criteria: PriorityCriteria
): Promise<{ providerCount: number; onboardingCount: number }> {
  const adminClient = createAdminClient()

  let providerCount = 0
  let onboardingCount = 0

  try {
    // Count providers based on criteria
    let providerQuery = adminClient
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ativo')

    if (criteria.services && criteria.services.length > 0) {
      providerQuery = providerQuery.overlaps('services', criteria.services)
    }
    if (criteria.districts && criteria.districts.length > 0) {
      providerQuery = providerQuery.overlaps('districts', criteria.districts)
    }
    if (criteria.entity_types && criteria.entity_types.length > 0) {
      providerQuery = providerQuery.in('entity_type', criteria.entity_types)
    }

    const { count: pCount } = await providerQuery
    providerCount = pCount || 0

    // Count completed onboardings
    let onboardingQuery = adminClient
      .from('onboarding_cards')
      .select('id, provider:providers!inner(*)', {
        count: 'exact',
        head: true,
      })
      .not('completed_at', 'is', null)

    if (criteria.services && criteria.services.length > 0) {
      onboardingQuery = onboardingQuery.overlaps(
        'provider.services',
        criteria.services
      )
    }
    if (criteria.districts && criteria.districts.length > 0) {
      onboardingQuery = onboardingQuery.overlaps(
        'provider.districts',
        criteria.districts
      )
    }
    if (criteria.entity_types && criteria.entity_types.length > 0) {
      onboardingQuery = onboardingQuery.in(
        'provider.entity_type',
        criteria.entity_types
      )
    }

    const { count: oCount } = await onboardingQuery
    onboardingCount = oCount || 0
  } catch (error) {
    console.error('Error calculating baseline:', error)
  }

  return { providerCount, onboardingCount }
}

// ========================================
// UPDATE FUNCTIONS
// ========================================

/**
 * Update priority progress manually
 */
export async function updatePriorityProgress(
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Utilizador não autenticado' }
    }

    const priorityId = formData.get('priority_id') as string
    const newValue = parseInt(formData.get('new_value') as string)
    const note = formData.get('note') as string | null

    if (!priorityId || isNaN(newValue)) {
      return { error: 'Dados inválidos' }
    }

    // Get current value
    const { data: priority } = await supabase
      .from('priorities')
      .select('current_value, target_value, status')
      .eq('id', priorityId)
      .single()

    if (!priority) {
      return { error: 'Prioridade não encontrada' }
    }

    // Log progress change
    await adminClient.from('priority_progress_log').insert({
      priority_id: priorityId,
      old_value: priority.current_value,
      new_value: newValue,
      change_reason: 'manual_update',
      changed_by: user.id,
      note,
    })

    // Update priority
    const updateData: Record<string, unknown> = {
      current_value: newValue,
    }

    const wasCompleted =
      newValue >= priority.target_value && priority.status === 'ativa'

    // Check if completed
    if (wasCompleted) {
      updateData.status = 'concluida'
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = user.id
      updateData.was_successful = true
    }

    await adminClient
      .from('priorities')
      .update(updateData)
      .eq('id', priorityId)

    // Generate completion alert if priority was just completed
    if (wasCompleted) {
      try {
        await generatePriorityCompletedAlert(priorityId)
      } catch (err) {
        console.error('Error generating priority completed alert:', err)
      }
    }

    revalidatePath('/prestadores')
    return { success: true }
  } catch (error) {
    console.error('Unexpected error updating progress:', error)
    return { error: 'Erro ao atualizar progresso' }
  }
}

/**
 * Soft delete priority
 */
export async function deletePriority(
  priorityId: string
): Promise<{ error?: string; success?: boolean }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Utilizador não autenticado' }
    }

    // Check permissions (only managers/admins can delete)
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (
      !userProfile ||
      !userProfile.role ||
      !['admin', 'manager'].includes(userProfile.role)
    ) {
      return { error: 'Sem permissão para remover prioridades' }
    }

    // Soft delete
    await adminClient
      .from('priorities')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', priorityId)

    revalidatePath('/prestadores')
    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting priority:', error)
    return { error: 'Erro ao remover prioridade' }
  }
}

/**
 * Cancel priority
 */
export async function cancelPriority(
  priorityId: string,
  reason?: string
): Promise<{ error?: string; success?: boolean }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Utilizador não autenticado' }
    }

    await adminClient
      .from('priorities')
      .update({
        status: 'cancelada',
        cancelled_at: new Date().toISOString(),
        completion_notes: reason || null,
        was_successful: false,
      })
      .eq('id', priorityId)

    revalidatePath('/prestadores')
    return { success: true }
  } catch (error) {
    console.error('Unexpected error cancelling priority:', error)
    return { error: 'Erro ao cancelar prioridade' }
  }
}

// ========================================
// AUTO-CALCULATION FUNCTIONS
// ========================================

/**
 * Calculate current progress for a priority based on its type
 */
export async function calculatePriorityProgress(
  priorityId: string
): Promise<{ error?: string; success?: boolean }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get priority details
    const { data: priority } = await supabase
      .from('priorities')
      .select('*')
      .eq('id', priorityId)
      .single()

    if (!priority) {
      return { error: 'Prioridade não encontrada' }
    }

    // Skip if not active
    if (priority.status !== 'ativa') {
      return { success: true }
    }

    // Skip manual types
    if (priority.type === 'outro') {
      return { success: true }
    }

    let currentCount = 0

    if (priority.type === 'ativar_prestadores') {
      currentCount = await countActivatedProviders(priority)
    } else if (priority.type === 'concluir_onboardings') {
      currentCount = await countCompletedOnboardings(priority)
    }

    const oldValue = priority.current_value

    // Update current_value
    const updateData: Record<string, unknown> = {
      current_value: currentCount,
    }

    // Check if completed
    const wasCompleted =
      currentCount >= priority.target_value && priority.status === 'ativa'

    if (wasCompleted) {
      updateData.status = 'concluida'
      updateData.completed_at = new Date().toISOString()
      updateData.was_successful = true
    }

    await adminClient.from('priorities').update(updateData).eq('id', priorityId)

    // Generate completion alert if priority was just completed
    if (wasCompleted) {
      try {
        await generatePriorityCompletedAlert(priorityId)
      } catch (err) {
        console.error('Error generating priority completed alert:', err)
      }
    }

    // Log progress change if value changed
    if (currentCount !== oldValue) {
      await adminClient.from('priority_progress_log').insert({
        priority_id: priorityId,
        old_value: oldValue,
        new_value: currentCount,
        change_reason: 'recalculation',
        changed_at: new Date().toISOString(),
      })
    }

    revalidatePath('/prestadores')
    revalidatePath('/prioridades')
    return { success: true }
  } catch (error) {
    console.error('Error calculating priority progress:', error)
    return { error: 'Erro ao calcular progresso' }
  }
}

/**
 * Count activated providers that match priority criteria
 */
async function countActivatedProviders(priority: any): Promise<number> {
  const adminClient = createAdminClient()
  const criteria = priority.criteria as PriorityCriteria

  let query = adminClient
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'ativo')
    .not('activated_at', 'is', null)
    .gte('activated_at', priority.created_at) // Only count activations AFTER priority creation

  // Apply criteria filters
  if (criteria.services && criteria.services.length > 0) {
    query = query.overlaps('services', criteria.services)
  }
  if (criteria.districts && criteria.districts.length > 0) {
    query = query.overlaps('districts', criteria.districts)
  }
  if (criteria.entity_types && criteria.entity_types.length > 0) {
    query = query.in('entity_type', criteria.entity_types)
  }

  const { count } = await query
  return count || 0
}

/**
 * Count completed onboardings that match priority criteria
 */
async function countCompletedOnboardings(priority: any): Promise<number> {
  const adminClient = createAdminClient()
  const criteria = priority.criteria as PriorityCriteria

  let query = adminClient
    .from('onboarding_cards')
    .select('id, provider:providers!inner(*)', {
      count: 'exact',
      head: true,
    })
    .not('completed_at', 'is', null)
    .gte('completed_at', priority.created_at) // Only count completions AFTER priority creation

  // Apply criteria on provider
  if (criteria.services && criteria.services.length > 0) {
    query = query.overlaps('provider.services', criteria.services)
  }
  if (criteria.districts && criteria.districts.length > 0) {
    query = query.overlaps('provider.districts', criteria.districts)
  }
  if (criteria.entity_types && criteria.entity_types.length > 0) {
    query = query.in('provider.entity_type', criteria.entity_types)
  }

  const { count } = await query
  return count || 0
}

/**
 * Recalculate all active priorities of a given type
 * Called when providers are activated or onboardings are completed
 */
export async function recalculateActivePriorities(
  type: 'ativar_prestadores' | 'concluir_onboardings'
): Promise<void> {
  const supabase = await createClient()

  const { data: activePriorities } = await supabase
    .from('priorities')
    .select('id')
    .eq('type', type)
    .eq('status', 'ativa')
    .is('deleted_at', null)

  if (!activePriorities || activePriorities.length === 0) {
    return
  }

  // Recalculate each priority
  for (const priority of activePriorities) {
    await calculatePriorityProgress(priority.id)
  }
}

/**
 * Recalculate only priorities that match the given provider's criteria
 * More performant than recalculating all priorities
 */
export async function recalculateMatchingPriorities(
  provider: {
    services?: string[] | null
    districts?: string[] | null
    entity_type: string
  },
  type: 'ativar_prestadores' | 'concluir_onboardings'
): Promise<void> {
  const supabase = await createClient()

  // Get all active priorities of this type
  const { data: activePriorities } = await supabase
    .from('priorities')
    .select('*')
    .eq('type', type)
    .eq('status', 'ativa')
    .is('deleted_at', null)

  if (!activePriorities || activePriorities.length === 0) {
    return
  }

  // Import the utility function
  const { providerMatchesCriteria } = await import('@/lib/priorities/utils')

  // Filter to only priorities that match this provider
  const matchingPriorities = activePriorities.filter((priority) =>
    providerMatchesCriteria(provider, priority.criteria as PriorityCriteria)
  )

  // Recalculate only matching priorities
  for (const priority of matchingPriorities) {
    await calculatePriorityProgress(priority.id)
  }
}

// ========================================
// NOTIFICATION FUNCTIONS
// ========================================

/**
 * Generate alerts for priorities with approaching deadlines
 */
export async function generatePriorityDeadlineAlerts() {
  const adminClient = createAdminClient()

  // Get alert threshold from settings (default: 2 days)
  const alertDays = 2

  const deadlineThreshold = new Date()
  deadlineThreshold.setDate(deadlineThreshold.getDate() + alertDays)

  // Find priorities with approaching deadline
  const { data: priorities } = await adminClient
    .from('priorities')
    .select(
      `
      id,
      title,
      deadline,
      assignments:priority_assignments(user_id)
    `
    )
    .eq('status', 'ativa')
    .is('deleted_at', null)
    .not('deadline', 'is', null)
    .lte('deadline', deadlineThreshold.toISOString())

  if (!priorities) return

  for (const priority of priorities) {
    for (const assignment of priority.assignments) {
      // Check if alert already exists in the last 24 hours
      const { count } = await adminClient
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('priority_id', priority.id)
        .eq('user_id', assignment.user_id)
        .eq('alert_type', 'priority_deadline_approaching')
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        )

      if (count === 0) {
        await adminClient.from('alerts').insert({
          priority_id: priority.id,
          user_id: assignment.user_id,
          alert_type: 'priority_deadline_approaching',
          title: `Prazo de prioridade a aproximar-se`,
          message: `A prioridade "${priority.title}" tem prazo em ${new Date(
            priority.deadline
          ).toLocaleDateString('pt-PT')}`,
        })
      }
    }
  }
}

/**
 * Generate alert when a priority is completed
 */
export async function generatePriorityCompletedAlert(priorityId: string) {
  const adminClient = createAdminClient()

  const { data: priority } = await adminClient
    .from('priorities')
    .select(
      `
      id,
      title,
      created_by,
      assignments:priority_assignments(user_id)
    `
    )
    .eq('id', priorityId)
    .single()

  if (!priority) return

  // Alert creator
  await adminClient.from('alerts').insert({
    priority_id: priority.id,
    user_id: priority.created_by,
    alert_type: 'priority_completed',
    title: `Prioridade concluída`,
    message: `A prioridade "${priority.title}" foi concluída!`,
  })

  // Alert all assigned users
  for (const assignment of priority.assignments) {
    if (assignment.user_id !== priority.created_by) {
      await adminClient.from('alerts').insert({
        priority_id: priority.id,
        user_id: assignment.user_id,
        alert_type: 'priority_completed',
        title: `Prioridade concluída`,
        message: `A prioridade "${priority.title}" foi concluída!`,
      })
    }
  }
}

/**
 * Generate alert when a new priority is assigned
 */
export async function generatePriorityCreatedAlert(
  priorityId: string,
  userIds: string[]
) {
  const adminClient = createAdminClient()

  const { data: priority } = await adminClient
    .from('priorities')
    .select('id, title')
    .eq('id', priorityId)
    .single()

  if (!priority) return

  // Alert all assigned users
  for (const userId of userIds) {
    await adminClient.from('alerts').insert({
      priority_id: priority.id,
      user_id: userId,
      alert_type: 'priority_created',
      title: `Nova prioridade atribuída`,
      message: `Foi-lhe atribuída a prioridade "${priority.title}"`,
    })
  }
}
