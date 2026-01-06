'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { OnboardingType } from '@/types/database'

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
  const { data: stages } = await createAdminClient()
    .from('stage_definitions')
    .select('id, stage_number, name')
    .eq('is_active', true)
    .order('display_order')

  if (!stages) return []

  // Obter cards em onboarding com providers
  let cardsQuery = createAdminClient()
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
  let query = createAdminClient()
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
  let query = createAdminClient()
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
  let query = createAdminClient()
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
  let candidaturasQuery = createAdminClient()
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
  const { data: stages } = await createAdminClient()
    .from('stage_definitions')
    .select('id, stage_number, name')
    .eq('is_active', true)
    .order('display_order')

  if (!stages) return []

  // Obter log de movimentacoes de etapas
  let query = createAdminClient()
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
  let query = createAdminClient()
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
  const { data } = await createAdminClient()
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

// KPI: Pipeline Distribution (Candidatura vs Onboarding)
export async function getPipelineDistribution(filters: KpiFilters = {}) {
  // Candidaturas (status = novo)
  let candidaturasQuery = createAdminClient()
    .from('providers')
    .select('id, entity_type, districts, first_application_at')
    .eq('status', 'novo')

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

  const { data: candidaturas } = await candidaturasQuery

  // Em Onboarding (status = em_onboarding)
  // Para onboarding, precisamos filtrar pela data de início do onboarding
  let onboardingQuery = createAdminClient()
    .from('onboarding_cards')
    .select(`
      id,
      onboarding_type,
      started_at,
      provider:providers(id, entity_type, districts, status)
    `)
    .is('completed_at', null)

  if (filters.onboardingType) {
    onboardingQuery = onboardingQuery.eq('onboarding_type', filters.onboardingType)
  }

  if (filters.dateFrom) {
    onboardingQuery = onboardingQuery.gte('started_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setDate(endDate.getDate() + 1)
    onboardingQuery = onboardingQuery.lt('started_at', endDate.toISOString().split('T')[0])
  }

  const { data: onboardingCards } = await onboardingQuery

  // Filtrar por entity_type e district
  type ProviderRelation = { id: string; entity_type: string; districts: string[]; status: string } | { id: string; entity_type: string; districts: string[]; status: string }[] | null
  const getProvider = (rel: ProviderRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  let filteredOnboarding = onboardingCards || []
  if (filters.entityType) {
    filteredOnboarding = filteredOnboarding.filter((c) => {
      const provider = getProvider(c.provider as ProviderRelation)
      return provider?.entity_type === filters.entityType
    })
  }

  if (filters.district) {
    filteredOnboarding = filteredOnboarding.filter((c) => {
      const provider = getProvider(c.provider as ProviderRelation)
      return provider?.districts?.includes(filters.district!)
    })
  }

  return {
    candidaturas: candidaturas?.length || 0,
    onboarding: filteredOnboarding.length,
  }
}

// KPI: Tempo medio por etapa separado por Normal vs Urgente
export async function getAverageTimePerStageByType(filters: KpiFilters = {}) {
  // Obter etapas
  const { data: stages } = await createAdminClient()
    .from('stage_definitions')
    .select('id, stage_number, name')
    .eq('is_active', true)
    .order('display_order')

  if (!stages) return []

  // Obter log de movimentacoes de etapas
  const query = createAdminClient()
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
      normalHours: 0,
      urgenteHours: 0,
      normalCount: 0,
      urgenteCount: 0,
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

  // Agrupar movimentacoes por card
  const cardTransitions = new Map<string, {
    onboardingType: string
    transitions: { stageId: string; enteredAt: Date; exitedAt: Date | null }[]
  }>()

  for (const log of filteredLogs) {
    const card = getCard(log.onboarding_card as CardRelation)
    if (!card) continue

    if (!cardTransitions.has(log.card_id)) {
      cardTransitions.set(log.card_id, {
        onboardingType: card.onboarding_type,
        transitions: []
      })
    }
    const cardData = cardTransitions.get(log.card_id)!
    const transitions = cardData.transitions

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

  // Calcular tempo medio por etapa separado por tipo
  const stageTimes = new Map<string, { normal: number[]; urgente: number[] }>()
  for (const stage of stages) {
    stageTimes.set(stage.id, { normal: [], urgente: [] })
  }

  for (const [, cardData] of cardTransitions) {
    for (const transition of cardData.transitions) {
      if (transition.exitedAt && stageTimes.has(transition.stageId)) {
        const hours = (transition.exitedAt.getTime() - transition.enteredAt.getTime()) / (1000 * 60 * 60)
        const times = stageTimes.get(transition.stageId)!
        if (cardData.onboardingType === 'urgente') {
          times.urgente.push(hours)
        } else {
          times.normal.push(hours)
        }
      }
    }
  }

  return stages.map((stage) => {
    const times = stageTimes.get(stage.id) || { normal: [], urgente: [] }
    const normalHours = times.normal.length > 0
      ? Math.round((times.normal.reduce((a, b) => a + b, 0) / times.normal.length) * 10) / 10
      : 0
    const urgenteHours = times.urgente.length > 0
      ? Math.round((times.urgente.reduce((a, b) => a + b, 0) / times.urgente.length) * 10) / 10
      : 0

    return {
      id: stage.id,
      stage_number: stage.stage_number,
      name: stage.name,
      normalHours,
      urgenteHours,
      normalCount: times.normal.length,
      urgenteCount: times.urgente.length,
    }
  })
}

// KPI: Tempo medio por owner
export async function getAverageTimeByOwner(filters: KpiFilters = {}) {
  // Obter todos os cards completados com owner
  let query = createAdminClient()
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
  const ownerTimes = new Map<string, {
    id: string
    name: string
    durations: number[]
  }>()

  for (const card of filteredCards) {
    const owner = getOwner(card.owner as OwnerRelation)
    if (!owner || !card.completed_at) continue

    if (!ownerTimes.has(owner.id)) {
      ownerTimes.set(owner.id, {
        id: owner.id,
        name: owner.name,
        durations: [],
      })
    }

    const start = new Date(card.started_at)
    const end = new Date(card.completed_at)
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    ownerTimes.get(owner.id)!.durations.push(days)
  }

  // Calcular metricas
  return Array.from(ownerTimes.values())
    .map((owner) => ({
      id: owner.id,
      name: owner.name,
      averageDays: owner.durations.length > 0
        ? Math.round((owner.durations.reduce((a, b) => a + b, 0) / owner.durations.length) * 10) / 10
        : 0,
      count: owner.durations.length,
    }))
    .filter((o) => o.count > 0)
    .sort((a, b) => a.averageDays - b.averageDays) // Ordenar por mais rapido
}

// KPI: Health/SLA indicators - prestadores em risco ou atrasados
export async function getHealthIndicators(filters: KpiFilters = {}) {
  // Obter cards em onboarding ativos
  let query = createAdminClient()
    .from('onboarding_cards')
    .select(`
      id,
      onboarding_type,
      started_at,
      current_stage_id,
      current_stage:stage_definitions!onboarding_cards_current_stage_id_fkey(stage_number),
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

  if (!cards || cards.length === 0) {
    return {
      onTime: 0,
      atRisk: 0,
      delayed: 0,
      total: 0,
    }
  }

  // Helper para obter provider de relação
  type ProviderRelation = { entity_type: string; districts: string[] } | { entity_type: string; districts: string[] }[] | null
  type StageRelation = { stage_number: number } | { stage_number: number }[] | null

  const getProvider = (rel: ProviderRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  const getStage = (rel: StageRelation) => {
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

  // Definir SLAs por tipo (dias)
  const slaByType = {
    normal: { expected: 14, warning: 10 },
    urgente: { expected: 5, warning: 3 },
  }

  const now = new Date()
  let onTime = 0
  let atRisk = 0
  let delayed = 0

  for (const card of filteredCards) {
    const startedAt = new Date(card.started_at)
    const daysElapsed = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24)
    const sla = slaByType[card.onboarding_type as 'normal' | 'urgente'] || slaByType.normal

    if (daysElapsed > sla.expected) {
      delayed++
    } else if (daysElapsed > sla.warning) {
      atRisk++
    } else {
      onTime++
    }
  }

  return {
    onTime,
    atRisk,
    delayed,
    total: filteredCards.length,
  }
}

// KPI: Motivos de abandono
export async function getAbandonmentReasons(filters: KpiFilters = {}) {
  let query = createAdminClient()
    .from('providers')
    .select(`
      id,
      entity_type,
      districts,
      abandonment_reason,
      updated_at,
      onboarding_card:onboarding_cards(onboarding_type)
    `)
    .eq('status', 'abandonado')
    .not('abandonment_reason', 'is', null)

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters.district) {
    query = query.contains('districts', [filters.district])
  }

  if (filters.dateFrom) {
    query = query.gte('updated_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setDate(endDate.getDate() + 1)
    query = query.lt('updated_at', endDate.toISOString().split('T')[0])
  }

  const { data } = await query

  if (!data || data.length === 0) return []

  // Filtrar por onboardingType se especificado
  type CardRelation = { onboarding_type: string } | { onboarding_type: string }[] | null
  const getCard = (rel: CardRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  let filteredData = data
  if (filters.onboardingType) {
    filteredData = filteredData.filter((p) => {
      const card = getCard(p.onboarding_card as CardRelation)
      return card?.onboarding_type === filters.onboardingType
    })
  }

  // Agrupar por motivo
  const reasonCounts = new Map<string, number>()
  for (const provider of filteredData) {
    const reason = provider.abandonment_reason || 'Não especificado'
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1)
  }

  return Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
}

// KPI: Taxa de abandono por etapa
export async function getAbandonmentByStage(filters: KpiFilters = {}) {
  // Obter etapas
  const { data: stages } = await createAdminClient()
    .from('stage_definitions')
    .select('id, stage_number, name')
    .eq('is_active', true)
    .order('display_order')

  if (!stages) return []

  // Obter prestadores abandonados e sua ultima etapa
  let query = createAdminClient()
    .from('providers')
    .select(`
      id,
      entity_type,
      districts,
      updated_at,
      onboarding_card:onboarding_cards(current_stage_id, onboarding_type)
    `)
    .eq('status', 'abandonado')

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters.district) {
    query = query.contains('districts', [filters.district])
  }

  if (filters.dateFrom) {
    query = query.gte('updated_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setDate(endDate.getDate() + 1)
    query = query.lt('updated_at', endDate.toISOString().split('T')[0])
  }

  const { data: providers } = await query

  if (!providers || providers.length === 0) {
    return stages.map((s) => ({ ...s, abandonedCount: 0 }))
  }

  // Helper para obter card
  type CardRelation = { current_stage_id: string; onboarding_type: string } | { current_stage_id: string; onboarding_type: string }[] | null
  const getCard = (rel: CardRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  // Filtrar por onboardingType se especificado
  let filteredProviders = providers
  if (filters.onboardingType) {
    filteredProviders = filteredProviders.filter((p) => {
      const card = getCard(p.onboarding_card as CardRelation)
      return card?.onboarding_type === filters.onboardingType
    })
  }

  // Contar abandonos por etapa
  const stageCounts = new Map<string, number>()
  for (const stage of stages) {
    stageCounts.set(stage.id, 0)
  }

  for (const provider of filteredProviders) {
    const card = getCard(provider.onboarding_card as CardRelation)
    if (card?.current_stage_id && stageCounts.has(card.current_stage_id)) {
      stageCounts.set(card.current_stage_id, stageCounts.get(card.current_stage_id)! + 1)
    }
  }

  return stages.map((stage) => ({
    id: stage.id,
    stage_number: stage.stage_number,
    name: stage.name,
    abandonedCount: stageCounts.get(stage.id) || 0,
  }))
}

// KPI: Tendencias temporais (ativacoes/candidaturas) com agregação dinâmica
export async function getTrends(filters: KpiFilters = {}) {
  const now = new Date()

  // Calcular periodo
  let startDate: Date
  let endDate: Date

  if (filters.dateFrom && filters.dateTo) {
    startDate = new Date(filters.dateFrom)
    endDate = new Date(filters.dateTo)
  } else if (filters.dateFrom) {
    startDate = new Date(filters.dateFrom)
    endDate = now
  } else if (filters.dateTo) {
    endDate = new Date(filters.dateTo)
    startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1)
  } else {
    // Default: últimos 6 meses
    startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    endDate = now
  }

  // Calcular número de dias no período
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // Determinar tipo de agregação baseado no período
  // ≤ 14 dias → dia | 15-60 dias → semana | > 60 dias → mês
  let aggregationType: 'day' | 'week' | 'month'
  if (daysDiff <= 14) {
    aggregationType = 'day'
  } else if (daysDiff <= 60) {
    aggregationType = 'week'
  } else {
    aggregationType = 'month'
  }

  // Gerar períodos baseado no tipo de agregação
  type Period = { key: string; label: string; start: Date; end: Date }
  const periods: Period[] = []

  if (aggregationType === 'day') {
    // Por dia
    const current = new Date(startDate)
    while (current <= endDate) {
      const dayStart = new Date(current)
      const dayEnd = new Date(current)
      dayEnd.setHours(23, 59, 59, 999)
      periods.push({
        key: current.toISOString().slice(0, 10), // YYYY-MM-DD
        label: current.toLocaleString('pt-PT', { day: '2-digit', month: 'short' }),
        start: dayStart,
        end: dayEnd,
      })
      current.setDate(current.getDate() + 1)
    }
  } else if (aggregationType === 'week') {
    // Por semana
    const current = new Date(startDate)
    // Ajustar para início da semana (segunda-feira)
    const dayOfWeek = current.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    current.setDate(current.getDate() + diff)

    let weekNum = 1
    while (current <= endDate) {
      const weekStart = new Date(current)
      const weekEnd = new Date(current)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const startLabel = weekStart.toLocaleString('pt-PT', { day: '2-digit', month: 'short' })
      const endLabel = weekEnd.toLocaleString('pt-PT', { day: '2-digit', month: 'short' })

      periods.push({
        key: `week-${weekNum}`,
        label: `${startLabel} - ${endLabel}`,
        start: weekStart,
        end: weekEnd,
      })
      current.setDate(current.getDate() + 7)
      weekNum++
    }
  } else {
    // Por mês
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    while (current <= endDate) {
      const monthStart = new Date(current)
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
      monthEnd.setHours(23, 59, 59, 999)

      periods.push({
        key: current.toISOString().slice(0, 7), // YYYY-MM
        label: current.toLocaleString('pt-PT', { month: 'short', year: '2-digit' }),
        start: monthStart,
        end: monthEnd,
      })
      current.setMonth(current.getMonth() + 1)
    }
  }

  // Limitar número de períodos para performance
  const maxPeriods = aggregationType === 'day' ? 31 : aggregationType === 'week' ? 12 : 12
  const limitedPeriods = periods.slice(-maxPeriods)

  if (limitedPeriods.length === 0) {
    return { aggregationType, data: [] }
  }

  // Buscar dados
  const queryStartDate = limitedPeriods[0].start.toISOString().split('T')[0]

  // Candidaturas
  let candidaturasQuery = createAdminClient()
    .from('providers')
    .select('id, first_application_at, entity_type, districts')
    .not('first_application_at', 'is', null)
    .gte('first_application_at', queryStartDate)

  if (filters.entityType) {
    candidaturasQuery = candidaturasQuery.eq('entity_type', filters.entityType)
  }

  if (filters.district) {
    candidaturasQuery = candidaturasQuery.contains('districts', [filters.district])
  }

  const { data: candidaturas } = await candidaturasQuery

  // Ativações
  let ativacoesQuery = createAdminClient()
    .from('onboarding_cards')
    .select(`
      id,
      completed_at,
      provider:providers(entity_type, districts)
    `)
    .not('completed_at', 'is', null)
    .gte('completed_at', queryStartDate)

  if (filters.onboardingType) {
    ativacoesQuery = ativacoesQuery.eq('onboarding_type', filters.onboardingType)
  }

  const { data: ativacoes } = await ativacoesQuery

  // Helper para obter provider
  type ProviderRelation = { entity_type: string; districts: string[] } | { entity_type: string; districts: string[] }[] | null
  const getProvider = (rel: ProviderRelation) => {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] : rel
  }

  // Filtrar ativações por entity_type e district
  let filteredAtivacoes = ativacoes || []
  if (filters.entityType) {
    filteredAtivacoes = filteredAtivacoes.filter((a) => {
      const provider = getProvider(a.provider as ProviderRelation)
      return provider?.entity_type === filters.entityType
    })
  }

  if (filters.district) {
    filteredAtivacoes = filteredAtivacoes.filter((a) => {
      const provider = getProvider(a.provider as ProviderRelation)
      return provider?.districts?.includes(filters.district!)
    })
  }

  // Helper para verificar se uma data está dentro de um período
  const isInPeriod = (dateStr: string | null, period: Period): boolean => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    return date >= period.start && date <= period.end
  }

  // Agrupar por período
  const data = limitedPeriods.map((period) => {
    const candidaturasCount = (candidaturas || []).filter((c) =>
      isInPeriod(c.first_application_at, period)
    ).length

    const ativacoesCount = filteredAtivacoes.filter((a) =>
      isInPeriod(a.completed_at, period)
    ).length

    return {
      key: period.key,
      label: period.label,
      candidaturas: candidaturasCount,
      ativacoes: ativacoesCount,
    }
  })

  return { aggregationType, data }
}
