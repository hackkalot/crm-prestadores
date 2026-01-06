'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ProviderStatus, AbandonmentParty, OnboardingType, TaskStatus } from '@/types/database'

export type CandidaturaFilters = {
  status?: ProviderStatus | 'all'
  entityType?: string
  district?: string
  service?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export async function getCandidaturas(filters: CandidaturaFilters = {}) {
  let query = createAdminClient()
    .from('providers')
    .select('*')
    .in('status', ['novo', 'em_onboarding', 'abandonado'])
    .order('created_at', { ascending: false })

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters.district) {
    query = query.contains('districts', [filters.district])
  }

  if (filters.service) {
    query = query.contains('services', [filters.service])
  }

  if (filters.dateFrom) {
    query = query.gte('first_application_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    // Add 1 day to include the entire end date
    const endDate = new Date(filters.dateTo)
    endDate.setDate(endDate.getDate() + 1)
    query = query.lt('first_application_at', endDate.toISOString().split('T')[0])
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,nif.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar candidaturas:', error)
    return []
  }

  return data || []
}

export async function getCandidaturaById(id: string) {
  const { data, error } = await createAdminClient()
    .from('providers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erro ao buscar candidatura:', error)
    return null
  }

  return data
}

export async function getApplicationHistory(providerId: string) {
  const { data, error } = await createAdminClient()
    .from('application_history')
    .select('*')
    .eq('provider_id', providerId)
    .order('applied_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar historico:', error)
    return []
  }

  return data || []
}

export type SendToOnboardingState = {
  error?: string
  success?: boolean
}

export async function sendToOnboarding(
  prevState: SendToOnboardingState,
  formData: FormData
): Promise<SendToOnboardingState> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const onboardingType = formData.get('onboardingType') as OnboardingType

  if (!providerId || !onboardingType) {
    return { error: 'Dados incompletos' }
  }

  // Obter utilizador atual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  // Obter primeira etapa usando admin client
  const { data: firstStage } = await createAdminClient()
    .from('stage_definitions')
    .select('id')
    .eq('stage_number', '1')
    .single()

  if (!firstStage) {
    return { error: 'Etapa inicial nao encontrada' }
  }

  // Criar card de onboarding usando admin client
  const { data: card, error: cardError } = await createAdminClient()
    .from('onboarding_cards')
    .insert({
      provider_id: providerId,
      onboarding_type: onboardingType,
      current_stage_id: firstStage.id,
      owner_id: user.id,
    })
    .select('id')
    .single()

  if (cardError || !card) {
    console.error('Erro ao criar card:', cardError)
    return { error: 'Erro ao criar processo de onboarding' }
  }

  // Obter todas as tarefas e criar instancias
  const { data: taskDefs } = await createAdminClient()
    .from('task_definitions')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (taskDefs && taskDefs.length > 0) {
    const tasks = taskDefs.map((def: {
      id: string
      default_deadline_hours_urgent: number | null
      default_deadline_hours_normal: number | null
      default_owner_id: string | null
    }) => {
      // Calcular prazo baseado no tipo de onboarding
      const deadlineHours = onboardingType === 'urgente'
        ? def.default_deadline_hours_urgent
        : def.default_deadline_hours_normal

      const deadlineAt = deadlineHours
        ? new Date(Date.now() + deadlineHours * 60 * 60 * 1000).toISOString()
        : null

      return {
        card_id: card.id,
        task_definition_id: def.id,
        owner_id: def.default_owner_id || user.id,
        deadline_at: deadlineAt,
        original_deadline_at: deadlineAt,
        status: 'por_fazer' as TaskStatus,
      }
    })

    await createAdminClient().from('onboarding_tasks').insert(tasks)
  }

  // Atualizar estado do prestador
  const { error: updateError } = await createAdminClient()
    .from('providers')
    .update({
      status: 'em_onboarding' as ProviderStatus,
      onboarding_started_at: new Date().toISOString(),
    })
    .eq('id', providerId)

  if (updateError) {
    console.error('Erro ao atualizar provider:', updateError)
    return { error: 'Erro ao atualizar estado do prestador' }
  }

  // Registar no histórico
  await createAdminClient()
    .from('history_log')
    .insert({
      provider_id: providerId,
      event_type: 'sent_to_onboarding',
      description: `Enviado para onboarding (${onboardingType})`,
      created_by: user.id,
    })

  revalidatePath('/candidaturas')
  revalidatePath('/onboarding')
  revalidatePath(`/providers/${providerId}`)

  return { success: true }
}

export type AbandonState = {
  error?: string
  success?: boolean
}

export async function abandonCandidatura(
  prevState: AbandonState,
  formData: FormData
): Promise<AbandonState> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const party = formData.get('party') as AbandonmentParty
  const reason = formData.get('reason') as string
  const notes = formData.get('notes') as string

  if (!providerId || !party || !reason) {
    return { error: 'Dados incompletos' }
  }

  // Obter utilizador atual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  const { error } = await createAdminClient()
    .from('providers')
    .update({
      status: 'abandonado' as ProviderStatus,
      abandonment_party: party,
      abandonment_reason: reason,
      abandonment_notes: notes || null,
      abandoned_at: new Date().toISOString(),
      abandoned_by: user.id,
    })
    .eq('id', providerId)

  if (error) {
    console.error('Erro ao abandonar:', error)
    return { error: 'Erro ao abandonar candidatura' }
  }

  // Registar no histórico
  const partyLabel = party === 'prestador' ? 'pelo prestador' : 'pela FIXO'
  await createAdminClient()
    .from('history_log')
    .insert({
      provider_id: providerId,
      event_type: 'abandoned',
      description: `Candidatura abandonada ${partyLabel}: ${reason}${notes ? ` - ${notes}` : ''}`,
      created_by: user.id,
    })

  revalidatePath('/candidaturas')
  revalidatePath(`/providers/${providerId}`)

  return { success: true }
}

// Obter lista de distritos unicos
export async function getDistinctDistricts() {
  const { data, error } = await createAdminClient()
    .from('providers')
    .select('districts')
    .not('districts', 'is', null)

  if (error || !data) return []

  const districts = new Set<string>()
  for (const p of data) {
    if (p.districts && Array.isArray(p.districts)) {
      for (const d of p.districts) {
        districts.add(d)
      }
    }
  }

  return Array.from(districts).sort()
}

// Obter lista de servicos unicos
export async function getDistinctServices() {
  const { data, error } = await createAdminClient()
    .from('providers')
    .select('services')
    .not('services', 'is', null)

  if (error || !data) return []

  const services = new Set<string>()
  for (const p of data) {
    if (p.services && Array.isArray(p.services)) {
      for (const s of p.services) {
        services.add(s)
      }
    }
  }

  return Array.from(services).sort()
}

// Estatisticas rapidas
export async function getCandidaturasStats() {
  const { data, error } = await createAdminClient()
    .from('providers')
    .select('status')
    .in('status', ['novo', 'em_onboarding', 'abandonado'])

  if (error || !data) return { novo: 0, em_onboarding: 0, abandonado: 0 }

  const result = { novo: 0, em_onboarding: 0, abandonado: 0 }

  for (const p of data) {
    const status = p.status as ProviderStatus
    if (status === 'novo' || status === 'em_onboarding' || status === 'abandonado') {
      result[status] = (result[status] || 0) + 1
    }
  }

  return result
}

// Recuperar candidatura abandonada
export type RecoverState = {
  error?: string
  success?: boolean
}

export async function recoverCandidatura(
  prevState: RecoverState,
  formData: FormData
): Promise<RecoverState> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const notes = formData.get('notes') as string

  if (!providerId) {
    return { error: 'Dados incompletos' }
  }

  // Obter utilizador atual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  // Verificar se o provider está abandonado
  const { data: provider } = await createAdminClient()
    .from('providers')
    .select('status')
    .eq('id', providerId)
    .single()

  if (!provider || provider.status !== 'abandonado') {
    return { error: 'Esta candidatura nao pode ser recuperada' }
  }

  // Atualizar estado do prestador para novo
  const { error } = await createAdminClient()
    .from('providers')
    .update({
      status: 'novo' as ProviderStatus,
      abandonment_party: null,
      abandonment_reason: null,
      abandonment_notes: null,
      abandoned_at: null,
      abandoned_by: null,
    })
    .eq('id', providerId)

  if (error) {
    console.error('Erro ao recuperar:', error)
    return { error: 'Erro ao recuperar candidatura' }
  }

  // Registar no histórico
  await createAdminClient()
    .from('history_log')
    .insert({
      provider_id: providerId,
      event_type: 'recovered',
      description: notes ? `Candidatura recuperada: ${notes}` : 'Candidatura recuperada',
      created_by: user.id,
    })

  revalidatePath('/candidaturas')
  revalidatePath(`/providers/${providerId}`)

  return { success: true }
}

// Remover prestador do onboarding
export type RemoveFromOnboardingState = {
  error?: string
  success?: boolean
}

export async function removeFromOnboarding(
  prevState: RemoveFromOnboardingState,
  formData: FormData
): Promise<RemoveFromOnboardingState> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const reason = formData.get('reason') as string

  if (!providerId) {
    return { error: 'Dados incompletos' }
  }

  // Obter utilizador atual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  // Verificar se o provider está em onboarding
  const { data: provider } = await createAdminClient()
    .from('providers')
    .select('status')
    .eq('id', providerId)
    .single()

  if (!provider || provider.status !== 'em_onboarding') {
    return { error: 'Este prestador nao esta em onboarding' }
  }

  // Obter o onboarding card
  const { data: card } = await createAdminClient()
    .from('onboarding_cards')
    .select('id')
    .eq('provider_id', providerId)
    .single()

  if (card) {
    // Apagar todas as tarefas do onboarding
    await createAdminClient()
      .from('onboarding_tasks')
      .delete()
      .eq('card_id', card.id)

    // Apagar o card de onboarding
    await createAdminClient()
      .from('onboarding_cards')
      .delete()
      .eq('id', card.id)
  }

  // Atualizar estado do prestador para novo
  const { error } = await createAdminClient()
    .from('providers')
    .update({
      status: 'novo' as ProviderStatus,
      onboarding_started_at: null,
    })
    .eq('id', providerId)

  if (error) {
    console.error('Erro ao remover do onboarding:', error)
    return { error: 'Erro ao remover do onboarding' }
  }

  // Registar no histórico
  await createAdminClient()
    .from('history_log')
    .insert({
      provider_id: providerId,
      event_type: 'removed_from_onboarding',
      description: reason ? `Removido do onboarding: ${reason}` : 'Removido do onboarding',
      created_by: user.id,
    })

  revalidatePath('/candidaturas')
  revalidatePath('/onboarding')
  revalidatePath(`/providers/${providerId}`)

  return { success: true }
}
