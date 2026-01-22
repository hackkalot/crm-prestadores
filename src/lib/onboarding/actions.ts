'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'
import { getFullySelectedDistricts } from '@/lib/data/portugal-districts'

export type TaskStatus = Database['public']['Enums']['task_status']
export type OnboardingType = Database['public']['Enums']['onboarding_type']

export type OnboardingFilters = {
  stageId?: string
  ownerId?: string
  onboardingType?: OnboardingType
  entityType?: string
  counties?: string[]  // Multi-select filter for concelhos
  search?: string
}

// Obter todas as etapas com cards
export async function getOnboardingKanban(filters: OnboardingFilters = {}) {
  const adminClient = createAdminClient()

  // Obter etapas
  const { data: stages, error: stagesError } = await adminClient
    .from('stage_definitions')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (stagesError || !stages) {
    console.error('Erro ao buscar etapas:', stagesError)
    return { stages: [], cards: [] }
  }

  // Obter cards com providers e tarefas
  // Filtrar apenas providers em_onboarding (não on_hold)
  let cardsQuery = adminClient
    .from('onboarding_cards')
    .select(`
      *,
      provider:providers!inner(*, relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email)),
      tasks:onboarding_tasks(
        *,
        task_definition:task_definitions(*)
      )
    `)
    .is('completed_at', null)
    .eq('provider.status', 'em_onboarding')
    .order('created_at', { ascending: false })

  if (filters.onboardingType) {
    cardsQuery = cardsQuery.eq('onboarding_type', filters.onboardingType)
  }

  const { data: cards, error: cardsError } = await cardsQuery

  if (cardsError) {
    console.error('Erro ao buscar cards:', cardsError)
    return { stages, cards: [] }
  }

  // UUID regex pattern for identifying service UUIDs
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // Obter mapa de serviços (UUID -> nome) para traduzir os IDs
  const allServiceIds = new Set<string>()
  for (const card of cards || []) {
    const provider = card.provider as { services?: string[] | null } | null
    if (provider?.services) {
      for (const serviceId of provider.services) {
        // Only add if it looks like a UUID
        if (UUID_REGEX.test(serviceId)) {
          allServiceIds.add(serviceId)
        }
      }
    }
  }

  // Buscar nomes dos serviços se houver IDs
  let serviceNamesMap: Record<string, string> = {}
  if (allServiceIds.size > 0) {
    const { data: services } = await adminClient
      .from('service_prices')
      .select('id, service_name')
      .in('id', Array.from(allServiceIds))

    if (services) {
      serviceNamesMap = Object.fromEntries(
        services.map(s => [s.id, s.service_name])
      )
    }
  }

  // Traduzir UUIDs de serviços para nomes nos cards e deduplicar
  const cardsWithServiceNames = (cards || []).map(card => {
    const provider = card.provider as { services?: string[] | null } | null
    if (provider?.services) {
      // Translate and deduplicate services
      const resolvedServices = provider.services.map(id =>
        UUID_REGEX.test(id) ? (serviceNamesMap[id] || id) : id
      )
      return {
        ...card,
        provider: {
          ...provider,
          services: [...new Set(resolvedServices)]
        }
      }
    }
    return card
  })

  // Filtrar cards em memória (pesquisa, ownerId, entityType, district)
  let filteredCards = cardsWithServiceNames

  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filteredCards = filteredCards.filter((card: { provider?: { name?: string; email?: string } | null }) =>
      card.provider?.name?.toLowerCase().includes(searchLower) ||
      card.provider?.email?.toLowerCase().includes(searchLower)
    )
  }

  if (filters.ownerId) {
    filteredCards = filteredCards.filter((card: { provider?: { relationship_owner_id?: string } | null }) =>
      card.provider?.relationship_owner_id === filters.ownerId
    )
  }

  if (filters.entityType) {
    filteredCards = filteredCards.filter((card: { provider?: { entity_type?: string } | null }) =>
      card.provider?.entity_type === filters.entityType
    )
  }

  // Filter by counties (concelhos) - check both 'counties' and 'districts' columns
  // (candidaturas may only have district-level data, not individual counties)
  if (filters.counties && filters.counties.length > 0) {
    const fullySelectedDistricts = getFullySelectedDistricts(filters.counties)

    filteredCards = filteredCards.filter((card: { provider?: { counties?: string[]; districts?: string[] } | null }) => {
      // Check if provider has matching counties
      const providerCounties = card.provider?.counties
      const hasMatchingCounty = providerCounties &&
        Array.isArray(providerCounties) &&
        filters.counties!.some(county => providerCounties.includes(county))

      if (hasMatchingCounty) return true

      // Check if provider has matching districts (for candidaturas with only district-level data)
      if (fullySelectedDistricts.length > 0) {
        const providerDistricts = card.provider?.districts
        const hasMatchingDistrict = providerDistricts &&
          Array.isArray(providerDistricts) &&
          fullySelectedDistricts.some(district => providerDistricts.includes(district))

        if (hasMatchingDistrict) return true
      }

      return false
    })
  }

  return { stages, cards: filteredCards }
}

// Obter detalhes de um card
export async function getOnboardingCard(cardId: string) {
  const { data, error } = await createAdminClient()
    .from('onboarding_cards')
    .select(`
      *,
      provider:providers(*, relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email)),
      tasks:onboarding_tasks(
        *,
        task_definition:task_definitions(
          *,
          stage:stage_definitions(id, name, stage_number, display_order)
        )
      ),
      current_stage:stage_definitions(*)
    `)
    .eq('id', cardId)
    .single()

  if (error) {
    console.error('Erro ao buscar card:', error)
    return null
  }

  return data
}

// Mover card para outra etapa
export type MoveCardState = {
  error?: string
  success?: boolean
}

export async function moveCardToStage(
  prevState: MoveCardState,
  formData: FormData
): Promise<MoveCardState> {
  const supabase = await createClient()

  const cardId = formData.get('cardId') as string
  const newStageId = formData.get('stageId') as string

  if (!cardId || !newStageId) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  // Obter card atual para log
  const { data: currentCard } = await createAdminClient()
    .from('onboarding_cards')
    .select('current_stage_id, provider_id')
    .eq('id', cardId)
    .single()

  if (!currentCard) {
    return { error: 'Card nao encontrado' }
  }

  // Atualizar etapa
  const { error } = await createAdminClient()
    .from('onboarding_cards')
    .update({ current_stage_id: newStageId })
    .eq('id', cardId)

  if (error) {
    console.error('Erro ao mover card:', error)
    return { error: 'Erro ao mover card' }
  }

  // Registar no historico
  await createAdminClient().from('history_log').insert({
    provider_id: currentCard.provider_id,
    card_id: cardId,
    event_type: 'stage_change',
    description: 'Card movido para nova etapa',
    old_value: { stage_id: currentCard.current_stage_id },
    new_value: { stage_id: newStageId },
    created_by: user.id,
  })

  revalidatePath('/onboarding')

  return { success: true }
}

// Atualizar estado de uma tarefa
export type UpdateTaskState = {
  error?: string
  success?: boolean
  movedToNextStage?: boolean
}

export async function updateTaskStatus(
  prevState: UpdateTaskState,
  formData: FormData
): Promise<UpdateTaskState> {
  const supabase = await createClient()

  const taskId = formData.get('taskId') as string
  const newStatus = formData.get('status') as TaskStatus

  if (!taskId || !newStatus) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  // Obter tarefa atual com task_definition para saber a etapa
  const { data: currentTask } = await createAdminClient()
    .from('onboarding_tasks')
    .select(`
      status,
      card_id,
      task_definition_id,
      task_definition:task_definitions(stage_id)
    `)
    .eq('id', taskId)
    .single()

  if (!currentTask) {
    return { error: 'Tarefa nao encontrada' }
  }

  const updateData: Record<string, unknown> = { status: newStatus }

  if (newStatus === 'em_curso' && !currentTask.status) {
    updateData.started_at = new Date().toISOString()
  }

  if (newStatus === 'concluida') {
    updateData.completed_at = new Date().toISOString()
    updateData.completed_by = user.id
  }

  const { error } = await createAdminClient()
    .from('onboarding_tasks')
    .update(updateData)
    .eq('id', taskId)

  if (error) {
    console.error('Erro ao atualizar tarefa:', error)
    return { error: 'Erro ao atualizar tarefa' }
  }

  // Obter card para log e verificacao de etapa
  const { data: card } = await createAdminClient()
    .from('onboarding_cards')
    .select('id, provider_id, current_stage_id')
    .eq('id', currentTask.card_id)
    .single()

  if (card) {
    await createAdminClient().from('history_log').insert({
      provider_id: card.provider_id,
      card_id: currentTask.card_id,
      task_id: taskId,
      event_type: newStatus === 'concluida' ? 'task_completed' : 'task_reopened',
      description: `Tarefa ${newStatus === 'concluida' ? 'concluida' : 'reaberta'}`,
      old_value: { status: currentTask.status },
      new_value: { status: newStatus },
      created_by: user.id,
    })

    // Se a tarefa foi concluida, verificar se todas as tarefas da etapa atual estao concluidas
    if (newStatus === 'concluida') {
      const movedToNextStage = await checkAndMoveToNextStage(
        card.id,
        card.current_stage_id,
        card.provider_id,
        user.id
      )

      revalidatePath('/onboarding')
      return { success: true, movedToNextStage }
    }
  }

  revalidatePath('/onboarding')

  return { success: true }
}

// Tipo para tarefa com definicao
interface TaskWithDefinition {
  id: string
  status: string
  task_definition: { stage_id: string } | { stage_id: string }[] | null
}

// Funcao auxiliar para calcular deadlines da proxima etapa em cascata
async function calculateNextStageDeadlines(
  cardId: string,
  nextStageId: string,
  onboardingType: OnboardingType
): Promise<void> {
  // Obter todas as tarefas da proxima etapa com as suas definicoes
  const { data: tasks } = await createAdminClient()
    .from('onboarding_tasks')
    .select(`
      id,
      deadline_at,
      task_definition:task_definitions(
        id,
        display_order,
        default_deadline_hours_normal,
        default_deadline_hours_urgent,
        stage_id
      )
    `)
    .eq('card_id', cardId)

  if (!tasks) return

  // Helper para extrair task_definition
  type TaskWithDef = {
    id: string
    deadline_at: string | null
    task_definition: {
      id: string
      display_order: number
      default_deadline_hours_normal: number | null
      default_deadline_hours_urgent: number | null
      stage_id: string
    } | {
      id: string
      display_order: number
      default_deadline_hours_normal: number | null
      default_deadline_hours_urgent: number | null
      stage_id: string
    }[] | null
  }

  const getTaskDef = (task: TaskWithDef) => {
    if (!task.task_definition) return null
    if (Array.isArray(task.task_definition)) return task.task_definition[0]
    return task.task_definition
  }

  // Filtrar tarefas da proxima etapa
  const nextStageTasks = (tasks as TaskWithDef[])
    .filter(task => {
      const def = getTaskDef(task)
      return def?.stage_id === nextStageId
    })
    .sort((a, b) => {
      const defA = getTaskDef(a)
      const defB = getTaskDef(b)
      return (defA?.display_order || 0) - (defB?.display_order || 0)
    })

  if (nextStageTasks.length === 0) return

  // Calcular deadlines em cascata
  const now = Date.now()
  let cumulativeMs = 0

  for (const task of nextStageTasks) {
    // Se já tem deadline definido (manual), não sobrescrever
    if (task.deadline_at) continue

    const def = getTaskDef(task)
    if (!def) continue

    const deadlineHours = onboardingType === 'urgente'
      ? def.default_deadline_hours_urgent
      : def.default_deadline_hours_normal

    if (deadlineHours) {
      cumulativeMs += deadlineHours * 60 * 60 * 1000
      const newDeadline = new Date(now + cumulativeMs).toISOString()

      // Atualizar deadline da tarefa
      await createAdminClient()
        .from('onboarding_tasks')
        .update({
          deadline_at: newDeadline,
          original_deadline_at: newDeadline,
        })
        .eq('id', task.id)
    }
  }
}

// Funcao auxiliar para verificar e mover para proxima etapa
async function checkAndMoveToNextStage(
  cardId: string,
  currentStageId: string,
  providerId: string,
  userId: string
): Promise<boolean> {
  // Obter todas as tarefas do card que pertencem a etapa atual
  const { data: allTasks } = await createAdminClient()
    .from('onboarding_tasks')
    .select(`
      id,
      status,
      task_definition:task_definitions(stage_id)
    `)
    .eq('card_id', cardId)

  if (!allTasks) return false

  // Helper para extrair stage_id de task_definition
  const getStageId = (taskDef: TaskWithDefinition['task_definition']): string | undefined => {
    if (!taskDef) return undefined
    if (Array.isArray(taskDef)) {
      return taskDef[0]?.stage_id
    }
    return taskDef.stage_id
  }

  // Filtrar tarefas da etapa atual
  const currentStageTasks = (allTasks as TaskWithDefinition[]).filter(
    (task) => getStageId(task.task_definition) === currentStageId
  )

  // Verificar se todas estao concluidas
  const allCompleted = currentStageTasks.every(
    (task) => task.status === 'concluida'
  )

  if (!allCompleted) return false

  // Obter proxima etapa
  const { data: currentStage } = await createAdminClient()
    .from('stage_definitions')
    .select('display_order')
    .eq('id', currentStageId)
    .single()

  if (!currentStage) return false

  const { data: nextStage } = await createAdminClient()
    .from('stage_definitions')
    .select('id, stage_number, name')
    .eq('is_active', true)
    .gt('display_order', currentStage.display_order)
    .order('display_order')
    .limit(1)
    .single()

  if (!nextStage) return false // Nao ha proxima etapa (ultima etapa)

  // Obter tipo de onboarding do card para calcular deadlines corretos
  const { data: card } = await createAdminClient()
    .from('onboarding_cards')
    .select('onboarding_type')
    .eq('id', cardId)
    .single()

  // Calcular deadlines para as tarefas da proxima etapa
  if (card) {
    await calculateNextStageDeadlines(cardId, nextStage.id, card.onboarding_type as OnboardingType)
  }

  // Mover card para proxima etapa
  const { error } = await createAdminClient()
    .from('onboarding_cards')
    .update({ current_stage_id: nextStage.id })
    .eq('id', cardId)

  if (error) {
    console.error('Erro ao mover card automaticamente:', error)
    return false
  }

  // Registar no historico
  await createAdminClient().from('history_log').insert({
    provider_id: providerId,
    card_id: cardId,
    event_type: 'stage_change',
    description: `Card movido automaticamente para etapa ${nextStage.stage_number} - ${nextStage.name}`,
    old_value: { stage_id: currentStageId },
    new_value: { stage_id: nextStage.id },
    created_by: userId,
  })

  return true
}

// Alterar responsável de um provider (usado no contexto do onboarding)
export async function changeCardOwner(
  prevState: UpdateTaskState,
  formData: FormData
): Promise<UpdateTaskState> {
  const supabase = await createClient()

  const cardId = formData.get('cardId') as string
  const newOwnerId = formData.get('ownerId') as string

  if (!cardId || !newOwnerId) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  const adminClient = createAdminClient()

  // Obter provider_id do card
  const { data: currentCard } = await adminClient
    .from('onboarding_cards')
    .select('provider_id')
    .eq('id', cardId)
    .single()

  if (!currentCard) {
    return { error: 'Card nao encontrado' }
  }

  // Obter owner atual do provider
  const { data: currentProvider } = await adminClient
    .from('providers')
    .select('relationship_owner_id')
    .eq('id', currentCard.provider_id)
    .single()

  // Atualizar relationship_owner_id no provider
  const { error } = await adminClient
    .from('providers')
    .update({ relationship_owner_id: newOwnerId })
    .eq('id', currentCard.provider_id)

  if (error) {
    console.error('Erro ao alterar responsavel:', error)
    return { error: 'Erro ao alterar responsavel' }
  }

  await adminClient.from('history_log').insert({
    provider_id: currentCard.provider_id,
    event_type: 'owner_change',
    description: 'Responsável alterado',
    old_value: { owner_id: currentProvider?.relationship_owner_id },
    new_value: { owner_id: newOwnerId },
    created_by: user.id,
  })

  revalidatePath('/onboarding')
  revalidatePath(`/providers/${currentCard.provider_id}`)

  return { success: true }
}

// Completar onboarding
export async function completeOnboarding(
  prevState: UpdateTaskState,
  formData: FormData
): Promise<UpdateTaskState> {
  const supabase = await createClient()

  const cardId = formData.get('cardId') as string

  if (!cardId) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  // Obter card
  const { data: card } = await createAdminClient()
    .from('onboarding_cards')
    .select('provider_id')
    .eq('id', cardId)
    .single()

  if (!card) {
    return { error: 'Card nao encontrado' }
  }

  // Marcar card como concluido
  const { error: cardError } = await createAdminClient()
    .from('onboarding_cards')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', cardId)

  if (cardError) {
    console.error('Erro ao concluir onboarding:', cardError)
    return { error: 'Erro ao concluir onboarding' }
  }

  // Ativar prestador
  const { error: providerError } = await createAdminClient()
    .from('providers')
    .update({
      status: 'ativo',
      activated_at: new Date().toISOString(),
    })
    .eq('id', card.provider_id)

  if (providerError) {
    console.error('Erro ao ativar prestador:', providerError)
    return { error: 'Erro ao ativar prestador' }
  }

  await createAdminClient().from('history_log').insert({
    provider_id: card.provider_id,
    card_id: cardId,
    event_type: 'status_change',
    description: 'Onboarding concluido - prestador ativado',
    old_value: { status: 'em_onboarding' },
    new_value: { status: 'ativo' },
    created_by: user.id,
  })

  // Recalculate priorities (both types affected by activation)
  try {
    const { recalculateActivePriorities } = await import('@/lib/priorities/actions')
    // Run in background to avoid blocking the response
    Promise.all([
      recalculateActivePriorities('ativar_prestadores'),
      recalculateActivePriorities('concluir_onboardings'),
    ]).catch((err) => console.error('Error recalculating priorities:', err))
  } catch (err) {
    console.error('Error importing priorities actions:', err)
  }

  revalidatePath('/onboarding')
  revalidatePath('/prestadores')
  revalidatePath('/prioridades')

  return { success: true }
}

// Obter utilizadores para selects (apenas Relationship Managers)
export async function getUsers() {
  const { data, error } = await createAdminClient()
    .from('users')
    .select('id, name, email')
    .eq('role', 'relationship_manager')
    .eq('approval_status', 'approved')
    .order('name')

  if (error) {
    console.error('Erro ao buscar users:', error)
    return []
  }

  return data || []
}

// Obter notas de um provider
export async function getProviderNotes(providerId: string) {
  const { data, error } = await createAdminClient()
    .from('notes')
    .select(`
      *,
      created_by_user:users!notes_created_by_fkey(id, name)
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar notas:', error)
    return []
  }

  return data || []
}

// Adicionar nota
export type AddNoteState = {
  error?: string
  success?: boolean
}

export async function addNote(
  prevState: AddNoteState,
  formData: FormData
): Promise<AddNoteState> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const content = formData.get('content') as string
  const noteType = formData.get('noteType') as string
  const taskId = formData.get('taskId') as string | null

  if (!providerId || !content) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  const { error } = await createAdminClient()
    .from('notes')
    .insert({
      provider_id: providerId,
      content,
      note_type: noteType || null,
      task_id: taskId || null,
      created_by: user.id,
    })

  if (error) {
    console.error('Erro ao adicionar nota:', error)
    return { error: 'Erro ao adicionar nota' }
  }

  // Registar no historico
  await createAdminClient().from('history_log').insert({
    provider_id: providerId,
    event_type: 'note_added',
    description: 'Nota adicionada',
    new_value: { content: content.substring(0, 100) + (content.length > 100 ? '...' : '') },
    created_by: user.id,
  })

  revalidatePath(`/onboarding`)
  revalidatePath(`/providers/${providerId}`)

  return { success: true }
}

// Obter historico de um provider
export async function getProviderHistory(providerId: string) {
  const { data, error } = await createAdminClient()
    .from('history_log')
    .select(`
      *,
      created_by_user:users!history_log_created_by_fkey(id, name)
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Erro ao buscar historico:', error)
    return []
  }

  return data || []
}

// Reagendar prazo de uma tarefa
export type RescheduleTaskState = {
  error?: string
  success?: boolean
}

export async function rescheduleTaskDeadline(
  prevState: RescheduleTaskState,
  formData: FormData
): Promise<RescheduleTaskState> {
  const supabase = await createClient()

  const taskId = formData.get('taskId') as string
  const newDeadline = formData.get('newDeadline') as string
  const reason = formData.get('reason') as string

  if (!taskId || !newDeadline) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  // Obter tarefa atual
  const { data: currentTask } = await createAdminClient()
    .from('onboarding_tasks')
    .select(`
      deadline_at,
      card_id,
      task_definition:task_definitions(name)
    `)
    .eq('id', taskId)
    .single()

  if (!currentTask) {
    return { error: 'Tarefa nao encontrada' }
  }

  const oldDeadline = currentTask.deadline_at

  // Atualizar prazo
  const { error } = await createAdminClient()
    .from('onboarding_tasks')
    .update({ deadline_at: new Date(newDeadline).toISOString() })
    .eq('id', taskId)

  if (error) {
    console.error('Erro ao reagendar tarefa:', error)
    return { error: 'Erro ao reagendar prazo' }
  }

  // Obter card para log
  const { data: card } = await createAdminClient()
    .from('onboarding_cards')
    .select('provider_id')
    .eq('id', currentTask.card_id)
    .single()

  if (card) {
    // Extrair nome da tarefa
    const taskDef = Array.isArray(currentTask.task_definition)
      ? currentTask.task_definition[0]
      : currentTask.task_definition
    const taskName = taskDef?.name || 'Tarefa'

    await createAdminClient().from('history_log').insert({
      provider_id: card.provider_id,
      card_id: currentTask.card_id,
      task_id: taskId,
      event_type: 'deadline_change',
      description: `Prazo da tarefa "${taskName}" reagendado`,
      old_value: { deadline_at: oldDeadline },
      new_value: { deadline_at: new Date(newDeadline).toISOString() },
      reason: reason || null,
      created_by: user.id,
    })
  }

  revalidatePath('/onboarding')

  return { success: true }
}

// Estatisticas do Kanban
export async function getOnboardingStats() {
  const { data: cards, error } = await createAdminClient()
    .from('onboarding_cards')
    .select(`
      id,
      onboarding_type,
      current_stage_id,
      tasks:onboarding_tasks(status, deadline_at)
    `)
    .is('completed_at', null)

  if (error || !cards) {
    return {
      total: 0,
      normal: 0,
      urgente: 0,
      atrasadas: 0,
    }
  }

  const now = new Date()
  let atrasadas = 0

  for (const card of cards) {
    const tasks = card.tasks as Array<{ status: string; deadline_at: string | null }>
    for (const task of tasks || []) {
      if (task.status !== 'concluida' && task.deadline_at && new Date(task.deadline_at) < now) {
        atrasadas++
        break
      }
    }
  }

  return {
    total: cards.length,
    normal: cards.filter((c: { onboarding_type: string }) => c.onboarding_type === 'normal').length,
    urgente: cards.filter((c: { onboarding_type: string }) => c.onboarding_type === 'urgente').length,
    atrasadas,
  }
}
