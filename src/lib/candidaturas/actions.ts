'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { unstable_cache } from 'next/cache'
import type { Database } from '@/types/database'

type ProviderStatus = Database['public']['Enums']['provider_status']
type AbandonmentParty = Database['public']['Enums']['abandonment_party']
type OnboardingType = Database['public']['Enums']['onboarding_type']
type TaskStatus = Database['public']['Enums']['task_status']

export type CandidaturaFilters = {
  status?: ProviderStatus | 'all'
  entityType?: string
  district?: string      // Legacy single filter
  service?: string       // Legacy single filter
  districts?: string[]   // Multi-select filter
  services?: string[]    // Multi-select filter
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedCandidaturas {
  data: Awaited<ReturnType<typeof getCandidaturasInternal>>
  total: number
  page: number
  limit: number
  totalPages: number
}

// Helper function to apply filters to a query
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCandidaturaFilters(query: any, filters: CandidaturaFilters) {
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  // Multi-select district filter (new)
  if (filters.districts && filters.districts.length > 0) {
    query = query.overlaps('districts', filters.districts)
  } else if (filters.district) {
    query = query.contains('districts', [filters.district])
  }

  // Multi-select service filter (new)
  if (filters.services && filters.services.length > 0) {
    query = query.overlaps('services', filters.services)
  } else if (filters.service) {
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

  return query
}

// Internal function to get candidaturas data
async function getCandidaturasInternal(filters: CandidaturaFilters = {}) {
  const sortBy = filters.sortBy || 'first_application_at'
  const sortOrder = filters.sortOrder || 'desc'
  const ascending = sortOrder === 'asc'

  let query = createAdminClient()
    .from('providers')
    .select('*')
    .in('status', ['novo', 'em_onboarding', 'abandonado'])
    .order(sortBy, { ascending })

  query = applyCandidaturaFilters(query, filters)

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar candidaturas:', error)
    return []
  }

  return data || []
}

// Obter candidaturas com paginação
export async function getCandidaturas(filters: CandidaturaFilters = {}): Promise<PaginatedCandidaturas> {
  const page = filters.page || 1
  const limit = filters.limit || 50
  const from = (page - 1) * limit
  const to = from + limit - 1
  const sortBy = filters.sortBy || 'first_application_at'
  const sortOrder = filters.sortOrder || 'desc'
  const ascending = sortOrder === 'asc'

  // First get total count with filters
  let countQuery = createAdminClient()
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .in('status', ['novo', 'em_onboarding', 'abandonado'])

  countQuery = applyCandidaturaFilters(countQuery, filters)
  const { count } = await countQuery

  // Now get paginated data
  let query = createAdminClient()
    .from('providers')
    .select('*')
    .in('status', ['novo', 'em_onboarding', 'abandonado'])

  query = applyCandidaturaFilters(query, filters)
  query = query
    .order(sortBy, { ascending })
    .range(from, to)

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar candidaturas:', error)
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    }
  }

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  }
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

  const adminClient = createAdminClient()

  // Verificar se provider tem relationship_owner_id, senão atribuir RM padrão das configurações
  const { data: provider } = await adminClient
    .from('providers')
    .select('relationship_owner_id')
    .eq('id', providerId)
    .single()

  if (!provider?.relationship_owner_id) {
    // Buscar RM padrão das configurações
    const { data: defaultOwnerSetting } = await adminClient
      .from('settings')
      .select('value')
      .eq('key', 'default_onboarding_owner_id')
      .single()

    let defaultOwnerId = user.id // Fallback para user atual

    if (defaultOwnerSetting?.value && defaultOwnerSetting.value !== 'null') {
      let settingValue = defaultOwnerSetting.value as string
      // Se for string JSON com aspas, remover
      if (typeof settingValue === 'string' && settingValue.startsWith('"') && settingValue.endsWith('"')) {
        settingValue = settingValue.slice(1, -1)
      }
      defaultOwnerId = settingValue
    }

    await adminClient
      .from('providers')
      .update({ relationship_owner_id: defaultOwnerId })
      .eq('id', providerId)
  }

  // Obter primeira etapa usando admin client
  const { data: firstStage } = await adminClient
    .from('stage_definitions')
    .select('id')
    .eq('stage_number', '1')
    .single()

  if (!firstStage) {
    return { error: 'Etapa inicial nao encontrada' }
  }

  // Criar card de onboarding usando admin client
  const { data: card, error: cardError } = await adminClient
    .from('onboarding_cards')
    .insert({
      provider_id: providerId,
      onboarding_type: onboardingType,
      current_stage_id: firstStage.id,
    })
    .select('id')
    .single()

  if (cardError || !card) {
    console.error('Erro ao criar card:', cardError)
    return { error: 'Erro ao criar processo de onboarding' }
  }

  // Obter todas as tarefas com informação da etapa
  const { data: taskDefs } = await adminClient
    .from('task_definitions')
    .select('*, stage:stage_definitions(id, stage_number)')
    .eq('is_active', true)
    .order('display_order')

  if (taskDefs && taskDefs.length > 0) {
    // Separar tarefas da primeira etapa das restantes
    type TaskDef = {
      id: string
      stage_id: string
      display_order: number
      default_deadline_hours_urgent: number | null
      default_deadline_hours_normal: number | null
      default_owner_id: string | null
      stage: { id: string; stage_number: string } | { id: string; stage_number: string }[] | null
    }

    const getStageNumber = (stage: TaskDef['stage']): string => {
      if (!stage) return '0'
      if (Array.isArray(stage)) return stage[0]?.stage_number || '0'
      return stage.stage_number
    }

    // Filtrar e ordenar tarefas da primeira etapa
    const firstStageTasks = (taskDefs as TaskDef[])
      .filter(def => getStageNumber(def.stage) === '1')
      .sort((a, b) => a.display_order - b.display_order)

    // Calcular deadlines em cascata para a primeira etapa
    const now = Date.now()
    let cumulativeMs = 0
    const firstStageDeadlines = new Map<string, string>()

    for (const def of firstStageTasks) {
      const deadlineHours = onboardingType === 'urgente'
        ? def.default_deadline_hours_urgent
        : def.default_deadline_hours_normal

      if (deadlineHours) {
        cumulativeMs += deadlineHours * 60 * 60 * 1000
        firstStageDeadlines.set(def.id, new Date(now + cumulativeMs).toISOString())
      }
    }

    // Criar todas as tarefas - apenas primeira etapa tem deadlines
    const tasks = (taskDefs as TaskDef[]).map(def => {
      const isFirstStage = getStageNumber(def.stage) === '1'
      const deadlineAt = isFirstStage ? (firstStageDeadlines.get(def.id) || null) : null

      return {
        card_id: card.id,
        task_definition_id: def.id,
        owner_id: def.default_owner_id || user.id,
        deadline_at: deadlineAt,
        original_deadline_at: deadlineAt,
        status: 'por_fazer' as TaskStatus,
      }
    })

    await adminClient.from('onboarding_tasks').insert(tasks)
  }

  // Atualizar estado do prestador
  const { error: updateError } = await adminClient
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
  await adminClient
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
  return unstable_cache(
    async () => {
      const { data, error } = await createAdminClient()
        .from('providers')
        .select('districts')
        .not('districts', 'is', null)
        .limit(10000)

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
    },
    ['all-districts'],
    { revalidate: 3600, tags: ['all-districts'] }
  )()
}

// Obter lista de servicos unicos
export async function getDistinctServices() {
  return unstable_cache(
    async () => {
      const { data, error } = await createAdminClient()
        .from('providers')
        .select('services')
        .not('services', 'is', null)
        .limit(10000)

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
    },
    ['all-services'],
    { revalidate: 3600, tags: ['all-services'] }
  )()
}

// Estatisticas rapidas - using count queries to avoid 1000 row limit
export async function getCandidaturasStats() {
  const supabase = createAdminClient()

  const [novoResult, onboardingResult, abandonadoResult] = await Promise.all([
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'novo'),
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'em_onboarding'),
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'abandonado'),
  ])

  return {
    novo: novoResult.count || 0,
    em_onboarding: onboardingResult.count || 0,
    abandonado: abandonadoResult.count || 0,
  }
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
