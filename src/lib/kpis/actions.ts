'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { OnboardingType } from '@/types/database'

// Cliente admin para operacoes que requerem bypass de RLS
function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type KpiFilters = {
  dateFrom?: string
  dateTo?: string
  entityType?: string
  district?: string
  onboardingType?: OnboardingType
}

// KPI: Prestadores por etapa do Kanban
export async function getProvidersPerStage(filters: KpiFilters = {}) {
  // Obter etapas
  const { data: stages } = await getSupabaseAdmin()
    .from('stage_definitions')
    .select('id, stage_number, name')
    .eq('is_active', true)
    .order('display_order')

  if (!stages) return []

  // Obter cards em onboarding com providers
  let cardsQuery = getSupabaseAdmin()
    .from('onboarding_cards')
    .select(`
      id,
      current_stage_id,
      onboarding_type,
      started_at,
      provider:providers(entity_type, districts)
    `)
    .is('completed_at', null)

  if (filters.onboardingType) {
    cardsQuery = cardsQuery.eq('onboarding_type', filters.onboardingType)
  }

  if (filters.dateFrom) {
    cardsQuery = cardsQuery.gte('started_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setDate(endDate.getDate() + 1)
    cardsQuery = cardsQuery.lt('started_at', endDate.toISOString().split('T')[0])
  }

  const { data: cards } = await cardsQuery

  if (!cards) return stages.map(s => ({ ...s, count: 0 }))

  // Helper para obter provider de relação (Supabase retorna array)
  type ProviderRelation = { entity_type: string; districts: string[] } | { entity_type: string; districts: string[] }[] | null
  const getProvider = (rel: ProviderRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  // Filtrar por entity_type e district se necessario
  let filteredCards = cards
  if (filters.entityType) {
    filteredCards = filteredCards.filter((c) => {
      const provider = getProvider(c.provider as ProviderRelation)
      return provider?.entity_type === filters.entityType
    })
  }

  if (filters.district) {
    filteredCards = filteredCards.filter((c) => {
      const provider = getProvider(c.provider as ProviderRelation)
      return provider?.districts?.includes(filters.district!)
    })
  }

  // Contar por etapa
  const stageCounts = stages.map((stage) => {
    const count = filteredCards.filter(
      (c: { current_stage_id: string }) => c.current_stage_id === stage.id
    ).length

    return {
      id: stage.id,
      stage_number: stage.stage_number,
      name: stage.name,
      count,
    }
  })

  return stageCounts
}

// KPI: Tempo medio de onboarding
export async function getAverageOnboardingTime(filters: KpiFilters = {}) {
  // Obter cards concluidos
  let query = getSupabaseAdmin()
    .from('onboarding_cards')
    .select(`
      id,
      onboarding_type,
      started_at,
      completed_at,
      provider:providers(entity_type, districts)
    `)
    .not('completed_at', 'is', null)

  if (filters.onboardingType) {
    query = query.eq('onboarding_type', filters.onboardingType)
  }

  if (filters.dateFrom) {
    query = query.gte('started_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setDate(endDate.getDate() + 1)
    query = query.lt('started_at', endDate.toISOString().split('T')[0])
  }

  const { data: cards } = await query

  if (!cards || cards.length === 0) {
    return {
      averageDays: 0,
      medianDays: 0,
      count: 0,
      normalAverage: 0,
      urgenteAverage: 0,
    }
  }

  // Helper para obter provider de relação
  type ProviderRelation = { entity_type: string; districts: string[] } | { entity_type: string; districts: string[] }[] | null
  const getProvider = (rel: ProviderRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  // Filtrar por entity_type e district
  let filteredCards = cards
  if (filters.entityType) {
    filteredCards = filteredCards.filter((c) => {
      const provider = getProvider(c.provider as ProviderRelation)
      return provider?.entity_type === filters.entityType
    })
  }

  if (filters.district) {
    filteredCards = filteredCards.filter((c) => {
      const provider = getProvider(c.provider as ProviderRelation)
      return provider?.districts?.includes(filters.district!)
    })
  }

  if (filteredCards.length === 0) {
    return {
      averageDays: 0,
      medianDays: 0,
      count: 0,
      normalAverage: 0,
      urgenteAverage: 0,
    }
  }

  // Calcular dias para cada card
  const durations = filteredCards.map((card) => {
    const start = new Date(card.started_at)
    const end = new Date(card.completed_at!)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  })

  // Media
  const averageDays = durations.reduce((a, b) => a + b, 0) / durations.length

  // Mediana
  const sorted = [...durations].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const medianDays = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2

  // Por tipo
  const normalCards = filteredCards.filter((c) => c.onboarding_type === 'normal')
  const urgenteCards = filteredCards.filter((c) => c.onboarding_type === 'urgente')

  const normalDurations = normalCards.map((card) => {
    const start = new Date(card.started_at)
    const end = new Date(card.completed_at!)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  })

  const urgenteDurations = urgenteCards.map((card) => {
    const start = new Date(card.started_at)
    const end = new Date(card.completed_at!)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  })

  const normalAverage = normalDurations.length > 0
    ? normalDurations.reduce((a, b) => a + b, 0) / normalDurations.length
    : 0

  const urgenteAverage = urgenteDurations.length > 0
    ? urgenteDurations.reduce((a, b) => a + b, 0) / urgenteDurations.length
    : 0

  return {
    averageDays: Math.round(averageDays * 10) / 10,
    medianDays: Math.round(medianDays * 10) / 10,
    count: filteredCards.length,
    normalAverage: Math.round(normalAverage * 10) / 10,
    urgenteAverage: Math.round(urgenteAverage * 10) / 10,
  }
}

// KPI: Total em onboarding
export async function getOnboardingTotals(filters: KpiFilters = {}) {
  let query = getSupabaseAdmin()
    .from('onboarding_cards')
    .select(`
      id,
      onboarding_type,
      started_at,
      provider:providers(entity_type, districts)
    `)
    .is('completed_at', null)

  if (filters.onboardingType) {
    query = query.eq('onboarding_type', filters.onboardingType)
  }

  if (filters.dateFrom) {
    query = query.gte('started_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setDate(endDate.getDate() + 1)
    query = query.lt('started_at', endDate.toISOString().split('T')[0])
  }

  const { data: cards } = await query

  if (!cards) return { total: 0, normal: 0, urgente: 0 }

  // Helper para obter provider de relação
  type ProviderRelation = { entity_type: string; districts: string[] } | { entity_type: string; districts: string[] }[] | null
  const getProvider = (rel: ProviderRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  // Filtrar
  let filteredCards = cards
  if (filters.entityType) {
    filteredCards = filteredCards.filter((c) => {
      const provider = getProvider(c.provider as ProviderRelation)
      return provider?.entity_type === filters.entityType
    })
  }

  if (filters.district) {
    filteredCards = filteredCards.filter((c) => {
      const provider = getProvider(c.provider as ProviderRelation)
      return provider?.districts?.includes(filters.district!)
    })
  }

  const normal = filteredCards.filter((c) => c.onboarding_type === 'normal').length
  const urgente = filteredCards.filter((c) => c.onboarding_type === 'urgente').length

  return {
    total: filteredCards.length,
    normal,
    urgente,
  }
}

// KPI: Candidaturas por tratar
export async function getCandidaturasPending(filters: KpiFilters = {}) {
  let query = getSupabaseAdmin()
    .from('providers')
    .select('id, entity_type, districts, first_application_at')
    .eq('status', 'novo')

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters.district) {
    query = query.contains('districts', [filters.district])
  }

  if (filters.dateFrom) {
    query = query.gte('first_application_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setDate(endDate.getDate() + 1)
    query = query.lt('first_application_at', endDate.toISOString().split('T')[0])
  }

  const { data } = await query

  return data?.length || 0
}

// KPI: Funil de conversao
export async function getConversionFunnel(filters: KpiFilters = {}) {
  // Total candidaturas (todos os status exceto abandonado)
  let candidaturasQuery = getSupabaseAdmin()
    .from('providers')
    .select('id, status, entity_type, districts, first_application_at')

  if (filters.entityType) {
    candidaturasQuery = candidaturasQuery.eq('entity_type', filters.entityType)
  }

  if (filters.district) {
    candidaturasQuery = candidaturasQuery.contains('districts', [filters.district])
  }

  if (filters.dateFrom) {
    candidaturasQuery = candidaturasQuery.gte('first_application_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setDate(endDate.getDate() + 1)
    candidaturasQuery = candidaturasQuery.lt('first_application_at', endDate.toISOString().split('T')[0])
  }

  const { data: providers } = await candidaturasQuery

  if (!providers) {
    return {
      candidaturas: 0,
      emOnboarding: 0,
      ativos: 0,
      abandonados: 0,
      taxaConversao: 0,
    }
  }

  const candidaturas = providers.filter((p) => p.status !== 'abandonado').length
  const emOnboarding = providers.filter((p) => p.status === 'em_onboarding').length
  const ativos = providers.filter((p) => p.status === 'ativo').length
  const abandonados = providers.filter((p) => p.status === 'abandonado').length

  const totalCandidaturas = candidaturas + abandonados
  const taxaConversao = totalCandidaturas > 0
    ? Math.round((ativos / totalCandidaturas) * 100)
    : 0

  return {
    candidaturas: totalCandidaturas,
    emOnboarding,
    ativos,
    abandonados,
    taxaConversao,
  }
}

// KPI: Tempo medio por etapa
export async function getAverageTimePerStage(filters: KpiFilters = {}) {
  // Obter etapas
  const { data: stages } = await getSupabaseAdmin()
    .from('stage_definitions')
    .select('id, stage_number, name')
    .eq('is_active', true)
    .order('display_order')

  if (!stages) return []

  // Obter log de movimentacoes de etapas
  let query = getSupabaseAdmin()
    .from('history_log')
    .select(`
      card_id,
      field_name,
      old_value,
      new_value,
      created_at,
      onboarding_card:onboarding_cards(
        onboarding_type,
        started_at,
        provider:providers(entity_type, districts)
      )
    `)
    .eq('table_name', 'onboarding_cards')
    .eq('field_name', 'current_stage_id')
    .order('created_at', { ascending: true })

  const { data: logs } = await query

  if (!logs || logs.length === 0) {
    return stages.map((stage) => ({
      id: stage.id,
      stage_number: stage.stage_number,
      name: stage.name,
      averageHours: 0,
      count: 0,
    }))
  }

  // Helper para obter provider de relação
  type ProviderRelation = { entity_type: string; districts: string[] } | { entity_type: string; districts: string[] }[] | null
  type CardRelation = {
    onboarding_type: string
    started_at: string
    provider: ProviderRelation
  } | {
    onboarding_type: string
    started_at: string
    provider: ProviderRelation
  }[] | null

  const getCard = (rel: CardRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  const getProvider = (rel: ProviderRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  // Aplicar filtros
  let filteredLogs = logs
  if (filters.onboardingType) {
    filteredLogs = filteredLogs.filter((log) => {
      const card = getCard(log.onboarding_card as CardRelation)
      return card?.onboarding_type === filters.onboardingType
    })
  }

  if (filters.entityType) {
    filteredLogs = filteredLogs.filter((log) => {
      const card = getCard(log.onboarding_card as CardRelation)
      const provider = card ? getProvider(card.provider as ProviderRelation) : null
      return provider?.entity_type === filters.entityType
    })
  }

  if (filters.district) {
    filteredLogs = filteredLogs.filter((log) => {
      const card = getCard(log.onboarding_card as CardRelation)
      const provider = card ? getProvider(card.provider as ProviderRelation) : null
      return provider?.districts?.includes(filters.district!)
    })
  }

  if (filters.dateFrom) {
    filteredLogs = filteredLogs.filter((log) => {
      const card = getCard(log.onboarding_card as CardRelation)
      return card && card.started_at >= filters.dateFrom!
    })
  }

  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setDate(endDate.getDate() + 1)
    filteredLogs = filteredLogs.filter((log) => {
      const card = getCard(log.onboarding_card as CardRelation)
      return card && card.started_at < endDate.toISOString().split('T')[0]
    })
  }

  // Agrupar movimentacoes por card para calcular tempo em cada etapa
  const cardTransitions = new Map<string, { stageId: string; enteredAt: Date; exitedAt: Date | null }[]>()

  for (const log of filteredLogs) {
    if (!cardTransitions.has(log.card_id)) {
      cardTransitions.set(log.card_id, [])
    }
    const transitions = cardTransitions.get(log.card_id)!

    // Marcar saida da etapa anterior
    if (log.old_value && transitions.length > 0) {
      const lastTransition = transitions[transitions.length - 1]
      if (lastTransition.stageId === log.old_value && !lastTransition.exitedAt) {
        lastTransition.exitedAt = new Date(log.created_at)
      }
    }

    // Registar entrada na nova etapa
    if (log.new_value) {
      transitions.push({
        stageId: log.new_value,
        enteredAt: new Date(log.created_at),
        exitedAt: null,
      })
    }
  }

  // Calcular tempo medio por etapa
  const stageTimes = new Map<string, number[]>()
  for (const stage of stages) {
    stageTimes.set(stage.id, [])
  }

  for (const [, transitions] of cardTransitions) {
    for (const transition of transitions) {
      if (transition.exitedAt) {
        const hours = (transition.exitedAt.getTime() - transition.enteredAt.getTime()) / (1000 * 60 * 60)
        if (stageTimes.has(transition.stageId)) {
          stageTimes.get(transition.stageId)!.push(hours)
        }
      }
    }
  }

  return stages.map((stage) => {
    const times = stageTimes.get(stage.id) || []
    const averageHours = times.length > 0
      ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10
      : 0

    return {
      id: stage.id,
      stage_number: stage.stage_number,
      name: stage.name,
      averageHours,
      count: times.length,
    }
  })
}

// KPI: Performance por owner
export async function getPerformanceByOwner(filters: KpiFilters = {}) {
  // Obter todos os owners com cards
  let query = getSupabaseAdmin()
    .from('onboarding_cards')
    .select(`
      id,
      owner_id,
      onboarding_type,
      started_at,
      completed_at,
      owner:users!onboarding_cards_owner_id_fkey(id, name, email),
      provider:providers(entity_type, districts)
    `)

  if (filters.onboardingType) {
    query = query.eq('onboarding_type', filters.onboardingType)
  }

  if (filters.dateFrom) {
    query = query.gte('started_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setDate(endDate.getDate() + 1)
    query = query.lt('started_at', endDate.toISOString().split('T')[0])
  }

  const { data: cards } = await query

  if (!cards || cards.length === 0) return []

  // Helper para obter relacoes
  type ProviderRelation = { entity_type: string; districts: string[] } | { entity_type: string; districts: string[] }[] | null
  type OwnerRelation = { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null

  const getProvider = (rel: ProviderRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  const getOwner = (rel: OwnerRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  // Filtrar por entity_type e district
  let filteredCards = cards
  if (filters.entityType) {
    filteredCards = filteredCards.filter((c) => {
      const provider = getProvider(c.provider as ProviderRelation)
      return provider?.entity_type === filters.entityType
    })
  }

  if (filters.district) {
    filteredCards = filteredCards.filter((c) => {
      const provider = getProvider(c.provider as ProviderRelation)
      return provider?.districts?.includes(filters.district!)
    })
  }

  // Agrupar por owner
  const ownerStats = new Map<string, {
    id: string
    name: string
    email: string
    totalCards: number
    completedCards: number
    inProgressCards: number
    totalDays: number
  }>()

  for (const card of filteredCards) {
    const owner = getOwner(card.owner as OwnerRelation)
    if (!owner) continue

    if (!ownerStats.has(owner.id)) {
      ownerStats.set(owner.id, {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        totalCards: 0,
        completedCards: 0,
        inProgressCards: 0,
        totalDays: 0,
      })
    }

    const stats = ownerStats.get(owner.id)!
    stats.totalCards++

    if (card.completed_at) {
      stats.completedCards++
      const start = new Date(card.started_at)
      const end = new Date(card.completed_at)
      stats.totalDays += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    } else {
      stats.inProgressCards++
    }
  }

  // Converter para array com metricas calculadas
  return Array.from(ownerStats.values()).map((stats) => ({
    id: stats.id,
    name: stats.name,
    email: stats.email,
    totalCards: stats.totalCards,
    completedCards: stats.completedCards,
    inProgressCards: stats.inProgressCards,
    averageDays: stats.completedCards > 0
      ? Math.round((stats.totalDays / stats.completedCards) * 10) / 10
      : 0,
    completionRate: stats.totalCards > 0
      ? Math.round((stats.completedCards / stats.totalCards) * 100)
      : 0,
  })).sort((a, b) => b.completedCards - a.completedCards)
}

// Obter distritos para filtro
export async function getDistrictsForKpis() {
  const { data } = await getSupabaseAdmin()
    .from('providers')
    .select('districts')
    .not('districts', 'is', null)

  if (!data) return []

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
