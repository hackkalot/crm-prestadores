'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { SLA_THRESHOLDS, RESPONSE_TIME_BUCKETS } from './constants'
import type {
  AnalyticsFilters,
  OperationalSummary,
  AtRiskProvider,
  SlaHealthIndicator,
  NetworkHealthData,
  ResponseTimeDistribution,
  AcceptanceTrendPoint,
  ProviderRankingItem,
  VolumeDistributionItem,
  FinancialSummary,
  RevenueByCategoryItem,
  TicketTrendPoint,
  PaymentStatusItem,
  RatingTrendPoint,
  CompletionByCategoryItem,
  AnalyticsFilterOptions,
  TrendGranularity,
  TrendData,
  RatingByCategoryItem,
  TicketByCategoryItem,
  CompletionTrendPoint,
  LowRatingProvider,
  ConcentrationMetrics,
  NetworkSaturationMetrics,
  CoverageGapItem,
} from './types'

// ==================
// Helper Functions
// ==================

function determineGranularity(from: string, to: string): TrendGranularity {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))

  if (days <= 31) return 'day'
  if (days <= 90) return 'week'
  return 'month'
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function getPeriodKey(dateStr: string, granularity: TrendGranularity): string {
  const date = new Date(dateStr)
  switch (granularity) {
    case 'day':
      return dateStr // YYYY-MM-DD
    case 'week':
      return `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`
    case 'month':
      return dateStr.substring(0, 7) // YYYY-MM
  }
}

function formatPeriodLabel(periodKey: string, granularity: TrendGranularity): string {
  switch (granularity) {
    case 'day': {
      const date = new Date(periodKey)
      return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
    }
    case 'week': {
      // Format: YYYY-Www
      const [year, week] = periodKey.split('-W')
      return `S${week}`
    }
    case 'month': {
      const [year, month] = periodKey.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return date.toLocaleDateString('pt-PT', { month: 'short' })
    }
  }
}

function getDateRange(filters: AnalyticsFilters): { from: string; to: string } {
  const now = new Date()
  const to = filters.dateTo || now.toISOString().split('T')[0]

  // Default to all time (desde 01-01-2023) quando não há filtro de data
  const from = filters.dateFrom || '2023-01-01'

  return { from, to }
}

function getPreviousMonthRange(): { from: string; to: string } {
  const now = new Date()
  const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  return {
    from: firstDayPrevMonth.toISOString().split('T')[0],
    to: lastDayPrevMonth.toISOString().split('T')[0],
  }
}

function getCurrentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)

  return {
    from: firstDay.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  }
}

function parseResponseTimeToHours(timeStr: string | null): number | null {
  if (!timeStr) return null
  // Format: HH:MM:SS or similar
  const parts = timeStr.split(':')
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    return hours + minutes / 60
  }
  return null
}

function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function getPreviousPeriodRange(from: string, to: string): { from: string; to: string } {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const periodDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))

  const prevTo = new Date(fromDate)
  prevTo.setDate(prevTo.getDate() - 1)
  const prevFrom = new Date(prevTo)
  prevFrom.setDate(prevFrom.getDate() - periodDays)

  return {
    from: prevFrom.toISOString().split('T')[0],
    to: prevTo.toISOString().split('T')[0],
  }
}

// ==================
// Summary Actions
// ==================

export async function getOperationalSummary(
  filters: AnalyticsFilters
): Promise<OperationalSummary> {
  const adminClient = createAdminClient()

  // Use filters if provided, otherwise default to current month
  const hasDateFilter = filters.dateFrom || filters.dateTo
  const { from: currentFrom, to: currentTo } = getDateRange(filters)

  // Calculate previous period based on current period length
  const { from: prevFrom, to: prevTo } = hasDateFilter
    ? getPreviousPeriodRange(currentFrom, currentTo)
    : getPreviousMonthRange()

  // Build service requests query with filters
  let currentServiceRequestsQuery = adminClient
    .from('service_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', currentFrom)
    .lte('created_at', currentTo)

  let prevServiceRequestsQuery = adminClient
    .from('service_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', prevFrom)
    .lte('created_at', prevTo)

  // Apply district filter to service requests
  if (filters.district) {
    currentServiceRequestsQuery = currentServiceRequestsQuery.eq('client_district', filters.district)
    prevServiceRequestsQuery = prevServiceRequestsQuery.eq('client_district', filters.district)
  }
  // Apply category filter to service requests
  if (filters.category) {
    currentServiceRequestsQuery = currentServiceRequestsQuery.eq('category', filters.category)
    prevServiceRequestsQuery = prevServiceRequestsQuery.eq('category', filters.category)
  }

  // Get all data in parallel
  const [
    { count: currentServiceRequestsCount },
    { count: prevServiceRequestsCount },
    { data: currentAllocation },
    { data: prevAllocation },
    { data: currentBilling },
    { data: prevBilling },
  ] = await Promise.all([
    currentServiceRequestsQuery,
    prevServiceRequestsQuery,
    adminClient
      .from('allocation_history')
      .select('*')
      .gte('period_from', currentFrom)
      .lte('period_to', currentTo),
    adminClient
      .from('allocation_history')
      .select('*')
      .gte('period_from', prevFrom)
      .lte('period_to', prevTo),
    adminClient
      .from('billing_processes')
      .select('total_invoice_value')
      .gte('document_date', currentFrom)
      .lte('document_date', currentTo),
    adminClient
      .from('billing_processes')
      .select('total_invoice_value')
      .gte('document_date', prevFrom)
      .lte('document_date', prevTo),
  ])

  // Calculate allocation metrics (current)
  const totalAllocatedCurrent = currentAllocation?.reduce(
    (sum, r) => sum + (r.requests_received || 0),
    0
  ) || 0
  const totalAcceptedCurrent = currentAllocation?.reduce(
    (sum, r) => sum + (r.requests_accepted || 0),
    0
  ) || 0
  const networkAcceptanceRateCurrent =
    totalAllocatedCurrent > 0
      ? Math.round((totalAcceptedCurrent / totalAllocatedCurrent) * 100)
      : 0

  // Calculate allocation metrics (previous)
  const totalAllocatedPrev = prevAllocation?.reduce(
    (sum, r) => sum + (r.requests_received || 0),
    0
  ) || 0
  const totalAcceptedPrev = prevAllocation?.reduce(
    (sum, r) => sum + (r.requests_accepted || 0),
    0
  ) || 0
  const networkAcceptanceRatePrev =
    totalAllocatedPrev > 0
      ? Math.round((totalAcceptedPrev / totalAllocatedPrev) * 100)
      : 0

  // Calculate revenue and ticket médio
  const totalRevenueCurrent = currentBilling?.reduce(
    (sum, r) => sum + (r.total_invoice_value || 0),
    0
  ) || 0
  const totalRevenuePrev = prevBilling?.reduce(
    (sum, r) => sum + (r.total_invoice_value || 0),
    0
  ) || 0
  const billingCountCurrent = currentBilling?.length || 0
  const billingCountPrev = prevBilling?.length || 0
  const avgTicketCurrent = billingCountCurrent > 0 ? totalRevenueCurrent / billingCountCurrent : 0
  const avgTicketPrev = billingCountPrev > 0 ? totalRevenuePrev / billingCountPrev : 0

  // Count at-risk providers (expiration rate > 30%)
  const atRiskProviders = currentAllocation?.filter((r) => {
    if ((r.requests_received || 0) < SLA_THRESHOLDS.MIN_VOLUME_FOR_ANALYSIS) return false
    const expirationRate = (r.requests_expired || 0) / (r.requests_received || 1) * 100
    return expirationRate > SLA_THRESHOLDS.EXPIRATION_RATE.CRITICAL
  }) || []

  // Total active providers (with any activity)
  const activeProviders = currentAllocation?.filter(
    (r) => (r.requests_received || 0) > 0
  ) || []

  // Service requests counts
  const serviceRequestsCurrent = currentServiceRequestsCount || 0
  const serviceRequestsPrev = prevServiceRequestsCount || 0

  // Rename for clarity: totalAllocatedCurrent = sent, totalAcceptedCurrent = accepted
  const totalSentCurrent = totalAllocatedCurrent
  const totalSentPrev = totalAllocatedPrev

  return {
    // Service Requests (pedidos reais criados)
    totalServiceRequests: serviceRequestsCurrent,
    totalServiceRequestsPrevPeriod: serviceRequestsPrev,
    serviceRequestsTrend: calculateTrend(serviceRequestsCurrent, serviceRequestsPrev),

    // Pedidos Enviados (oferecidos aos prestadores)
    totalSentRequests: totalSentCurrent,
    totalSentRequestsPrevPeriod: totalSentPrev,
    sentRequestsTrend: calculateTrend(totalSentCurrent, totalSentPrev),

    // Pedidos Aceites (realmente alocados)
    totalAcceptedRequests: totalAcceptedCurrent,
    totalAcceptedRequestsPrevPeriod: totalAcceptedPrev,
    acceptedRequestsTrend: calculateTrend(totalAcceptedCurrent, totalAcceptedPrev),

    // Legacy fields (maps to sent for backwards compatibility)
    totalRequests: totalSentCurrent,
    totalRequestsPrevMonth: totalSentPrev,
    requestsTrend: calculateTrend(totalSentCurrent, totalSentPrev),
    totalAllocatedRequests: totalSentCurrent,
    totalAllocatedRequestsPrevPeriod: totalSentPrev,
    allocatedRequestsTrend: calculateTrend(totalSentCurrent, totalSentPrev),

    // Acceptance Rate
    networkAcceptanceRate: networkAcceptanceRateCurrent,
    networkAcceptanceRatePrevMonth: networkAcceptanceRatePrev,
    acceptanceTrend: calculateTrend(
      networkAcceptanceRateCurrent,
      networkAcceptanceRatePrev
    ),

    // Ticket Médio
    avgTicket: Math.round(avgTicketCurrent),
    avgTicketPrevPeriod: Math.round(avgTicketPrev),
    avgTicketTrend: calculateTrend(avgTicketCurrent, avgTicketPrev),

    // At Risk
    atRiskProvidersCount: atRiskProviders.length,
    totalActiveProviders: activeProviders.length,

    // Revenue
    totalRevenue: totalRevenueCurrent,
    totalRevenuePrevMonth: totalRevenuePrev,
    revenueTrend: calculateTrend(totalRevenueCurrent, totalRevenuePrev),
  }
}

// ==================
// Operational Health
// ==================

export async function getAtRiskProviders(
  filters: AnalyticsFilters
): Promise<AtRiskProvider[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  // Get latest allocation data for each provider
  const { data: allocations } = await adminClient
    .from('allocation_history')
    .select('*')
    .gte('period_from', from)
    .lte('period_to', to)
    .gte('requests_received', SLA_THRESHOLDS.MIN_VOLUME_FOR_ANALYSIS)
    .order('period_to', { ascending: false })

  if (!allocations || allocations.length === 0) return []

  // Get unique latest record per provider
  const latestByProvider = new Map<number, typeof allocations[0]>()
  for (const alloc of allocations) {
    if (!latestByProvider.has(alloc.backoffice_provider_id)) {
      latestByProvider.set(alloc.backoffice_provider_id, alloc)
    }
  }

  // Filter and map to at-risk providers
  const atRiskProviders: AtRiskProvider[] = []

  for (const alloc of latestByProvider.values()) {
    const received = alloc.requests_received || 0
    const accepted = alloc.requests_accepted || 0
    const expired = alloc.requests_expired || 0
    const rejected = alloc.requests_rejected || 0

    const expirationRate = received > 0 ? (expired / received) * 100 : 0
    const acceptanceRate = received > 0 ? (accepted / received) * 100 : 0
    const rejectionRate = received > 0 ? (rejected / received) * 100 : 0

    // Check if at risk (expiration > warning threshold)
    if (expirationRate > SLA_THRESHOLDS.EXPIRATION_RATE.WARNING) {
      const riskLevel =
        expirationRate > SLA_THRESHOLDS.EXPIRATION_RATE.CRITICAL
          ? 'critical'
          : 'warning'

      atRiskProviders.push({
        backofficeProviderId: alloc.backoffice_provider_id,
        providerName: alloc.provider_name,
        requestsReceived: received,
        requestsAccepted: accepted,
        requestsExpired: expired,
        requestsRejected: rejected,
        acceptanceRate: Math.round(acceptanceRate),
        expirationRate: Math.round(expirationRate),
        rejectionRate: Math.round(rejectionRate),
        avgResponseTime: alloc.avg_response_time_raw,
        periodFrom: alloc.period_from,
        periodTo: alloc.period_to,
        riskLevel,
      })
    }
  }

  // Sort by expiration rate descending
  return atRiskProviders.sort((a, b) => b.expirationRate - a.expirationRate)
}

export async function getSlaHealthIndicators(
  filters: AnalyticsFilters
): Promise<SlaHealthIndicator[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  const { data: allocations } = await adminClient
    .from('allocation_history')
    .select('*')
    .gte('period_from', from)
    .lte('period_to', to)
    .gte('requests_received', SLA_THRESHOLDS.MIN_VOLUME_FOR_ANALYSIS)

  if (!allocations || allocations.length === 0) {
    return [
      { status: 'ok', label: 'Saudável', count: 0, percentage: 0 },
      { status: 'warning', label: 'Em Risco', count: 0, percentage: 0 },
      { status: 'critical', label: 'Crítico', count: 0, percentage: 0 },
    ]
  }

  // Get unique latest record per provider
  const latestByProvider = new Map<number, typeof allocations[0]>()
  for (const alloc of allocations) {
    const existing = latestByProvider.get(alloc.backoffice_provider_id)
    if (!existing || new Date(alloc.period_to) > new Date(existing.period_to)) {
      latestByProvider.set(alloc.backoffice_provider_id, alloc)
    }
  }

  let okCount = 0
  let warningCount = 0
  let criticalCount = 0

  for (const alloc of latestByProvider.values()) {
    const received = alloc.requests_received || 0
    const expired = alloc.requests_expired || 0
    const expirationRate = received > 0 ? (expired / received) * 100 : 0

    if (expirationRate <= SLA_THRESHOLDS.EXPIRATION_RATE.OK) {
      okCount++
    } else if (expirationRate <= SLA_THRESHOLDS.EXPIRATION_RATE.WARNING) {
      warningCount++
    } else {
      criticalCount++
    }
  }

  const total = okCount + warningCount + criticalCount

  return [
    {
      status: 'ok',
      label: 'Saudável',
      count: okCount,
      percentage: total > 0 ? Math.round((okCount / total) * 100) : 0,
    },
    {
      status: 'warning',
      label: 'Em Risco',
      count: warningCount,
      percentage: total > 0 ? Math.round((warningCount / total) * 100) : 0,
    },
    {
      status: 'critical',
      label: 'Crítico',
      count: criticalCount,
      percentage: total > 0 ? Math.round((criticalCount / total) * 100) : 0,
    },
  ]
}

export async function getNetworkHealthData(
  filters: AnalyticsFilters
): Promise<NetworkHealthData> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  // Fetch allocation history for provider health
  const { data: allocations } = await adminClient
    .from('allocation_history')
    .select('*')
    .gte('period_from', from)
    .lte('period_to', to)
    .gte('requests_received', SLA_THRESHOLDS.MIN_VOLUME_FOR_ANALYSIS)

  // Fetch service requests count
  // Note: service_requests uses created_at for dates and client_district for district
  let serviceRequestsQuery = adminClient
    .from('service_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', from)
    .lte('created_at', to)

  if (filters.district) {
    serviceRequestsQuery = serviceRequestsQuery.eq('client_district', filters.district)
  }
  if (filters.category) {
    serviceRequestsQuery = serviceRequestsQuery.eq('category', filters.category)
  }

  const { count: serviceRequestsCount } = await serviceRequestsQuery

  // Calculate health indicators
  const emptyIndicators: SlaHealthIndicator[] = [
    { status: 'ok', label: 'Saudável', count: 0, percentage: 0 },
    { status: 'warning', label: 'Em Risco', count: 0, percentage: 0 },
    { status: 'critical', label: 'Crítico', count: 0, percentage: 0 },
  ]

  if (!allocations || allocations.length === 0) {
    return {
      indicators: emptyIndicators,
      totalProviders: 0,
      totalServiceRequests: serviceRequestsCount || 0,
      healthScore: 0,
    }
  }

  // Get unique latest record per provider
  const latestByProvider = new Map<number, typeof allocations[0]>()
  for (const alloc of allocations) {
    const existing = latestByProvider.get(alloc.backoffice_provider_id)
    if (!existing || new Date(alloc.period_to) > new Date(existing.period_to)) {
      latestByProvider.set(alloc.backoffice_provider_id, alloc)
    }
  }

  let okCount = 0
  let warningCount = 0
  let criticalCount = 0

  for (const alloc of latestByProvider.values()) {
    const received = alloc.requests_received || 0
    const expired = alloc.requests_expired || 0
    const expirationRate = received > 0 ? (expired / received) * 100 : 0

    if (expirationRate <= SLA_THRESHOLDS.EXPIRATION_RATE.OK) {
      okCount++
    } else if (expirationRate <= SLA_THRESHOLDS.EXPIRATION_RATE.WARNING) {
      warningCount++
    } else {
      criticalCount++
    }
  }

  const total = okCount + warningCount + criticalCount

  // Calculate health score (weighted: ok=100, warning=50, critical=0)
  const healthScore = total > 0
    ? Math.round((okCount * 100 + warningCount * 50 + criticalCount * 0) / total)
    : 0

  const indicators: SlaHealthIndicator[] = [
    {
      status: 'ok',
      label: 'Saudável',
      count: okCount,
      percentage: total > 0 ? Math.round((okCount / total) * 100) : 0,
    },
    {
      status: 'warning',
      label: 'Em Risco',
      count: warningCount,
      percentage: total > 0 ? Math.round((warningCount / total) * 100) : 0,
    },
    {
      status: 'critical',
      label: 'Crítico',
      count: criticalCount,
      percentage: total > 0 ? Math.round((criticalCount / total) * 100) : 0,
    },
  ]

  return {
    indicators,
    totalProviders: total,
    totalServiceRequests: serviceRequestsCount || 0,
    healthScore,
  }
}

export async function getResponseTimeDistribution(
  filters: AnalyticsFilters
): Promise<ResponseTimeDistribution[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  const { data: allocations } = await adminClient
    .from('allocation_history')
    .select('avg_response_time_raw')
    .gte('period_from', from)
    .lte('period_to', to)
    .not('avg_response_time_raw', 'is', null)

  if (!allocations || allocations.length === 0) {
    return RESPONSE_TIME_BUCKETS.map((bucket) => ({
      bucket: bucket.label,
      count: 0,
      percentage: 0,
    }))
  }

  const bucketCounts = new Map<string, number>()
  RESPONSE_TIME_BUCKETS.forEach((b) => bucketCounts.set(b.label, 0))

  for (const alloc of allocations) {
    const hours = parseResponseTimeToHours(alloc.avg_response_time_raw)
    if (hours === null) continue

    for (const bucket of RESPONSE_TIME_BUCKETS) {
      if (hours <= bucket.maxHours) {
        bucketCounts.set(bucket.label, (bucketCounts.get(bucket.label) || 0) + 1)
        break
      }
    }
  }

  const total = allocations.length

  return RESPONSE_TIME_BUCKETS.map((bucket) => ({
    bucket: bucket.label,
    count: bucketCounts.get(bucket.label) || 0,
    percentage:
      total > 0
        ? Math.round(((bucketCounts.get(bucket.label) || 0) / total) * 100)
        : 0,
  }))
}

// ==================
// Network Performance
// ==================

export async function getAcceptanceTrend(
  filters: AnalyticsFilters
): Promise<TrendData<AcceptanceTrendPoint>> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  const { data: allocations } = await adminClient
    .from('allocation_history')
    .select('*')
    .gte('period_from', from)
    .lte('period_to', to)
    .order('period_from', { ascending: true })

  if (!allocations || allocations.length === 0) {
    return { granularity: 'week', data: [] }
  }

  // allocation_history já tem dados pré-agregados por períodos (semanais/quinzenais)
  // Agrupar por período nativo (period_from -> period_to) em vez de forçar granularidade
  const byPeriod = new Map<string, {
    periodFrom: string
    periodTo: string
    received: number
    accepted: number
    expired: number
  }>()

  for (const alloc of allocations) {
    // Usar period_from como chave única do período
    const periodKey = alloc.period_from
    const current = byPeriod.get(periodKey) || {
      periodFrom: alloc.period_from,
      periodTo: alloc.period_to,
      received: 0,
      accepted: 0,
      expired: 0,
    }
    byPeriod.set(periodKey, {
      periodFrom: alloc.period_from,
      periodTo: alloc.period_to,
      received: current.received + (alloc.requests_received || 0),
      accepted: current.accepted + (alloc.requests_accepted || 0),
      expired: current.expired + (alloc.requests_expired || 0),
    })
  }

  const trend: AcceptanceTrendPoint[] = []

  for (const [periodKey, data] of byPeriod.entries()) {
    // Calcular duração do período para label
    const fromDate = new Date(data.periodFrom)
    const toDate = new Date(data.periodTo)

    // Formatar label: "1-7 Jan" ou "Jan" se período maior
    const periodLabel = formatAllocationPeriodLabel(fromDate, toDate)

    trend.push({
      period: periodKey,
      periodLabel,
      acceptanceRate:
        data.received > 0 ? Math.round((data.accepted / data.received) * 100) : 0,
      expirationRate:
        data.received > 0 ? Math.round((data.expired / data.received) * 100) : 0,
      totalReceived: data.received,
      totalAccepted: data.accepted,
      totalExpired: data.expired,
    })
  }

  // Determinar granularidade baseada nos períodos reais
  const granularity = determineGranularityFromPeriods(allocations)

  return {
    granularity,
    data: trend.sort((a, b) => a.period.localeCompare(b.period)),
  }
}

function formatAllocationPeriodLabel(from: Date, to: Date): string {
  const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff <= 7) {
    // Período semanal: "1-7 Jan"
    const fromDay = from.getDate()
    const toDay = to.getDate()
    const month = from.toLocaleDateString('pt-PT', { month: 'short' })
    return `${fromDay}-${toDay} ${month}`
  } else if (daysDiff <= 15) {
    // Período quinzenal: "1-15 Jan"
    const fromDay = from.getDate()
    const toDay = to.getDate()
    const month = from.toLocaleDateString('pt-PT', { month: 'short' })
    return `${fromDay}-${toDay} ${month}`
  } else {
    // Período mensal ou maior: "Jan"
    return from.toLocaleDateString('pt-PT', { month: 'short' })
  }
}

function determineGranularityFromPeriods(allocations: { period_from: string; period_to: string }[]): TrendGranularity {
  if (allocations.length === 0) return 'week'

  // Calcular duração média dos períodos
  let totalDays = 0
  for (const alloc of allocations) {
    const from = new Date(alloc.period_from)
    const to = new Date(alloc.period_to)
    totalDays += Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  }
  const avgDays = totalDays / allocations.length

  if (avgDays <= 10) return 'week'
  if (avgDays <= 20) return 'week' // quinzenal ainda é "week" para efeitos de display
  return 'month'
}

export async function getProviderRanking(
  filters: AnalyticsFilters,
  sortBy: 'acceptance' | 'volume' | 'expiration' | 'revenue' | 'avgTicket' | 'avgRating' = 'acceptance',
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc'
): Promise<ProviderRankingItem[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  // Get allocation data - fetch ALL records in period (not just those with min volume)
  const { data: allocations } = await adminClient
    .from('allocation_history')
    .select('*')
    .gte('period_from', from)
    .lte('period_to', to)

  // Get billing data for revenue metrics
  // NOTA: billing_processes usa assigned_provider_name (string), não backoffice_provider_id
  const { data: billing } = await adminClient
    .from('billing_processes')
    .select('assigned_provider_name, total_service_cost, total_invoice_value')
    .gte('document_date', from)
    .lte('document_date', to)
    .not('assigned_provider_name', 'is', null)

  // Get ratings from service_requests
  // NOTA: service_requests usa assigned_provider_name (string), não backoffice_provider_id
  const { data: ratings } = await adminClient
    .from('service_requests')
    .select('assigned_provider_name, service_rating')
    .gte('created_at', from)
    .lte('created_at', to)
    .gt('service_rating', 0)
    .not('assigned_provider_name', 'is', null)

  if (!allocations || allocations.length === 0) return []

  // Aggregate billing by provider NAME (string match)
  const billingByProviderName = new Map<string, { total: number; count: number }>()
  billing?.forEach((b) => {
    if (!b.assigned_provider_name) return
    const name = b.assigned_provider_name.trim().toLowerCase()
    const current = billingByProviderName.get(name) || { total: 0, count: 0 }
    billingByProviderName.set(name, {
      total: current.total + (b.total_invoice_value || 0),
      count: current.count + 1,
    })
  })

  // Aggregate ratings by provider NAME (string match)
  const ratingsByProviderName = new Map<string, { sum: number; count: number }>()
  ratings?.forEach((r) => {
    if (!r.assigned_provider_name) return
    const name = r.assigned_provider_name.trim().toLowerCase()
    const current = ratingsByProviderName.get(name) || { sum: 0, count: 0 }
    ratingsByProviderName.set(name, {
      sum: current.sum + (r.service_rating || 0),
      count: current.count + 1,
    })
  })

  // Aggregate ALL allocation records per provider (sum all periods)
  const aggregatedByProvider = new Map<number, {
    providerName: string
    received: number
    accepted: number
    expired: number
  }>()

  for (const alloc of allocations) {
    const current = aggregatedByProvider.get(alloc.backoffice_provider_id) || {
      providerName: alloc.provider_name,
      received: 0,
      accepted: 0,
      expired: 0,
    }
    aggregatedByProvider.set(alloc.backoffice_provider_id, {
      providerName: alloc.provider_name,
      received: current.received + (alloc.requests_received || 0),
      accepted: current.accepted + (alloc.requests_accepted || 0),
      expired: current.expired + (alloc.requests_expired || 0),
    })
  }

  // Map to ranking items with all metrics (filtering by min volume AFTER aggregation)
  let items: ProviderRankingItem[] = Array.from(aggregatedByProvider.entries())
    .filter(([_, data]) => data.received >= SLA_THRESHOLDS.MIN_VOLUME_FOR_ANALYSIS)
    .map(([providerId, data]) => {
      // Match by provider name (case-insensitive)
      const nameKey = data.providerName.trim().toLowerCase()
      const billingData = billingByProviderName.get(nameKey)
      const ratingData = ratingsByProviderName.get(nameKey)

      return {
        backofficeProviderId: providerId,
        providerName: data.providerName,
        requestsReceived: data.received,
        requestsAccepted: data.accepted,
        acceptanceRate: data.received > 0 ? Math.round((data.accepted / data.received) * 100) : 0,
        expirationRate: data.received > 0 ? Math.round((data.expired / data.received) * 100) : 0,
        avgResponseTime: null, // Can't aggregate this meaningfully
        rank: 0,
        revenue: billingData?.total || 0,
        avgTicket: billingData && billingData.count > 0
          ? Math.round(billingData.total / billingData.count)
          : 0,
        avgRating: ratingData && ratingData.count > 0
          ? Math.round((ratingData.sum / ratingData.count) * 10) / 10
          : 0,
      }
    })

  // Sort based on criteria
  items.sort((a, b) => {
    let valueA: number, valueB: number
    switch (sortBy) {
      case 'volume':
        valueA = a.requestsReceived
        valueB = b.requestsReceived
        break
      case 'expiration':
        valueA = a.expirationRate
        valueB = b.expirationRate
        break
      case 'revenue':
        valueA = a.revenue || 0
        valueB = b.revenue || 0
        break
      case 'avgTicket':
        valueA = a.avgTicket || 0
        valueB = b.avgTicket || 0
        break
      case 'avgRating':
        valueA = a.avgRating || 0
        valueB = b.avgRating || 0
        break
      default:
        valueA = a.acceptanceRate
        valueB = b.acceptanceRate
    }
    return order === 'desc' ? valueB - valueA : valueA - valueB
  })

  // Add ranking and limit
  items = items.slice(0, limit).map((item, index) => ({
    ...item,
    rank: index + 1,
  }))

  return items
}

export async function getVolumeDistribution(
  filters: AnalyticsFilters,
  limit: number = 10
): Promise<VolumeDistributionItem[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  const { data: allocations } = await adminClient
    .from('allocation_history')
    .select('provider_name, requests_received')
    .gte('period_from', from)
    .lte('period_to', to)
    .order('period_to', { ascending: false })

  if (!allocations || allocations.length === 0) return []

  // Aggregate by provider
  const byProvider = new Map<string, number>()
  for (const alloc of allocations) {
    const current = byProvider.get(alloc.provider_name) || 0
    byProvider.set(alloc.provider_name, current + (alloc.requests_received || 0))
  }

  const totalVolume = Array.from(byProvider.values()).reduce((a, b) => a + b, 0)

  // Sort and limit
  const sorted = Array.from(byProvider.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  return sorted.map(([name, volume]) => ({
    providerName: name,
    volume,
    percentage: totalVolume > 0 ? Math.round((volume / totalVolume) * 100) : 0,
  }))
}

// ==================
// Financial
// ==================

export async function getFinancialSummary(
  filters: AnalyticsFilters
): Promise<FinancialSummary> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  const { data: billing } = await adminClient
    .from('billing_processes')
    .select('total_service_cost, total_invoice_value, process_status')
    .gte('document_date', from)
    .lte('document_date', to)

  if (!billing || billing.length === 0) {
    return {
      totalRevenue: 0,
      totalInvoiceValue: 0,
      avgTicket: 0,
      totalProcesses: 0,
      paidProcesses: 0,
      pendingProcesses: 0,
    }
  }

  const totalRevenue = billing.reduce(
    (sum, r) => sum + (r.total_service_cost || 0),
    0
  )
  const totalInvoiceValue = billing.reduce(
    (sum, r) => sum + (r.total_invoice_value || 0),
    0
  )
  const paidProcesses = billing.filter((r) => r.process_status === 'pago').length
  const pendingProcesses = billing.filter(
    (r) => r.process_status !== 'pago' && r.process_status !== 'arquivado'
  ).length

  return {
    totalRevenue,
    totalInvoiceValue,
    avgTicket: billing.length > 0 ? Math.round(totalRevenue / billing.length) : 0,
    totalProcesses: billing.length,
    paidProcesses,
    pendingProcesses,
  }
}

export async function getRevenueByCategory(
  filters: AnalyticsFilters,
  limit: number = 10
): Promise<RevenueByCategoryItem[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  const { data: billing } = await adminClient
    .from('billing_processes')
    .select('service, total_service_cost')
    .gte('document_date', from)
    .lte('document_date', to)
    .not('service', 'is', null)

  if (!billing || billing.length === 0) return []

  // Aggregate by service/category
  const byCategory = new Map<string, { revenue: number; count: number }>()

  for (const b of billing) {
    const category = b.service || 'Outros'
    const current = byCategory.get(category) || { revenue: 0, count: 0 }
    byCategory.set(category, {
      revenue: current.revenue + (b.total_service_cost || 0),
      count: current.count + 1,
    })
  }

  const totalRevenue = Array.from(byCategory.values()).reduce(
    (sum, c) => sum + c.revenue,
    0
  )

  // Sort and limit
  const sorted = Array.from(byCategory.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, limit)

  return sorted.map(([category, data]) => ({
    category,
    revenue: data.revenue,
    count: data.count,
    percentage:
      totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
  }))
}

export async function getTicketTrend(
  filters: AnalyticsFilters
): Promise<TrendData<TicketTrendPoint>> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)
  const granularity = determineGranularity(from, to)

  const { data: billing } = await adminClient
    .from('billing_processes')
    .select('document_date, total_service_cost')
    .gte('document_date', from)
    .lte('document_date', to)
    .not('document_date', 'is', null)
    .order('document_date', { ascending: true })

  if (!billing || billing.length === 0) {
    return { granularity, data: [] }
  }

  // Group by period based on granularity
  const byPeriod = new Map<string, { total: number; count: number }>()

  for (const b of billing) {
    if (!b.document_date) continue
    const periodKey = getPeriodKey(b.document_date, granularity)
    const current = byPeriod.get(periodKey) || { total: 0, count: 0 }
    byPeriod.set(periodKey, {
      total: current.total + (b.total_service_cost || 0),
      count: current.count + 1,
    })
  }

  const data = Array.from(byPeriod.entries())
    .map(([periodKey, periodData]) => ({
      period: periodKey,
      periodLabel: formatPeriodLabel(periodKey, granularity),
      avgTicket: periodData.count > 0 ? Math.round(periodData.total / periodData.count) : 0,
      totalRevenue: periodData.total,
      count: periodData.count,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))

  return { granularity, data }
}

export async function getPaymentStatusBreakdown(
  filters: AnalyticsFilters
): Promise<PaymentStatusItem[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  const { data: billing } = await adminClient
    .from('billing_processes')
    .select('process_status, total_invoice_value')
    .gte('document_date', from)
    .lte('document_date', to)

  if (!billing || billing.length === 0) return []

  // Group by status
  const byStatus = new Map<string, { count: number; value: number }>()

  for (const b of billing) {
    const status = b.process_status || 'desconhecido'
    const current = byStatus.get(status) || { count: 0, value: 0 }
    byStatus.set(status, {
      count: current.count + 1,
      value: current.value + (b.total_invoice_value || 0),
    })
  }

  const total = billing.length

  return Array.from(byStatus.entries())
    .map(([status, data]) => ({
      status,
      count: data.count,
      value: data.value,
      percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

// ==================
// Quality
// ==================

export async function getRatingTrend(
  filters: AnalyticsFilters
): Promise<TrendData<RatingTrendPoint>> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)
  const granularity = determineGranularity(from, to)

  const { data: requests } = await adminClient
    .from('service_requests')
    .select('created_at, service_rating')
    .gte('created_at', from)
    .lte('created_at', to)
    .gt('service_rating', 0)
    .order('created_at', { ascending: true })

  if (!requests || requests.length === 0) {
    return { granularity, data: [] }
  }

  // Group by period based on granularity
  const byPeriod = new Map<string, { sum: number; count: number }>()

  for (const r of requests) {
    const periodKey = getPeriodKey(r.created_at.substring(0, 10), granularity)
    const current = byPeriod.get(periodKey) || { sum: 0, count: 0 }
    byPeriod.set(periodKey, {
      sum: current.sum + (r.service_rating || 0),
      count: current.count + 1,
    })
  }

  // Calculate network average
  const totalSum = requests.reduce((sum, r) => sum + (r.service_rating || 0), 0)
  const networkAvg = requests.length > 0 ? totalSum / requests.length : 0

  const data = Array.from(byPeriod.entries())
    .map(([periodKey, periodData]) => ({
      period: periodKey,
      periodLabel: formatPeriodLabel(periodKey, granularity),
      avgRating: periodData.count > 0 ? Math.round((periodData.sum / periodData.count) * 10) / 10 : 0,
      totalRatings: periodData.count,
      networkAvgRating: Math.round(networkAvg * 10) / 10,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))

  return { granularity, data }
}

export async function getCompletionByCategory(
  filters: AnalyticsFilters
): Promise<CompletionByCategoryItem[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  const { data: requests } = await adminClient
    .from('service_requests')
    .select('category, status')
    .gte('created_at', from)
    .lte('created_at', to)
    .not('category', 'is', null)

  if (!requests || requests.length === 0) return []

  // Group by category
  const byCategory = new Map<string, { total: number; completed: number }>()

  for (const r of requests) {
    const category = r.category || 'Outros'
    const current = byCategory.get(category) || { total: 0, completed: 0 }
    const isCompleted = r.status === 'Concluído'
    byCategory.set(category, {
      total: current.total + 1,
      completed: current.completed + (isCompleted ? 1 : 0),
    })
  }

  return Array.from(byCategory.entries())
    .map(([category, data]) => ({
      category,
      totalRequests: data.total,
      completedRequests: data.completed,
      completionRate:
        data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.totalRequests - a.totalRequests)
}

// ==================
// Filter Options
// ==================

export async function getAnalyticsFilterOptions(): Promise<AnalyticsFilterOptions> {
  const adminClient = createAdminClient()

  // Get districts from service_requests
  const { data: districtData } = await adminClient
    .from('service_requests')
    .select('client_district')
    .not('client_district', 'is', null)

  const districts = [
    ...new Set(districtData?.map((d) => d.client_district).filter(Boolean) || []),
  ].sort() as string[]

  // Get categories from service_requests
  const { data: categoryData } = await adminClient
    .from('service_requests')
    .select('category')
    .not('category', 'is', null)

  const categories = [
    ...new Set(categoryData?.map((c) => c.category).filter(Boolean) || []),
  ].sort() as string[]

  // Get providers from allocation_history
  const { data: providerData } = await adminClient
    .from('allocation_history')
    .select('backoffice_provider_id, provider_name')
    .order('provider_name', { ascending: true })

  const providersMap = new Map<number, string>()
  providerData?.forEach((p) => {
    if (!providersMap.has(p.backoffice_provider_id)) {
      providersMap.set(p.backoffice_provider_id, p.provider_name)
    }
  })

  const providers = Array.from(providersMap.entries()).map(([id, name]) => ({
    id,
    name,
  }))

  // Get available periods
  const { data: periodData } = await adminClient
    .from('allocation_history')
    .select('period_from, period_to')
    .order('period_from', { ascending: false })

  const periodsSet = new Set<string>()
  periodData?.forEach((p) => {
    periodsSet.add(`${p.period_from}|${p.period_to}`)
  })

  const periods = Array.from(periodsSet)
    .slice(0, 12)
    .map((p) => {
      const [from, to] = p.split('|')
      return { from, to }
    })

  return {
    districts,
    categories,
    providers,
    periods,
  }
}

// ==================
// NEW: Rating by Category
// ==================

export async function getRatingByCategory(
  filters: AnalyticsFilters
): Promise<RatingByCategoryItem[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  const { data: requests } = await adminClient
    .from('service_requests')
    .select('category, service_rating')
    .gte('created_at', from)
    .lte('created_at', to)
    .gt('service_rating', 0)
    .not('category', 'is', null)

  if (!requests || requests.length === 0) return []

  // Group by category
  const byCategory = new Map<string, { ratings: number[]; sum: number }>()

  for (const r of requests) {
    const category = r.category || 'Outros'
    const current = byCategory.get(category) || { ratings: [], sum: 0 }
    current.ratings.push(r.service_rating || 0)
    current.sum += r.service_rating || 0
    byCategory.set(category, current)
  }

  return Array.from(byCategory.entries())
    .map(([category, data]) => {
      // Calculate rating distribution (1-5)
      const distribution = [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: data.ratings.filter((r) => Math.round(r) === rating).length,
      }))

      return {
        category,
        avgRating: data.ratings.length > 0
          ? Math.round((data.sum / data.ratings.length) * 10) / 10
          : 0,
        totalRatings: data.ratings.length,
        ratingDistribution: distribution,
      }
    })
    .sort((a, b) => b.totalRatings - a.totalRatings)
}

// ==================
// NEW: Ticket by Category
// ==================

export async function getTicketByCategory(
  filters: AnalyticsFilters,
  limit: number = 10
): Promise<TicketByCategoryItem[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  const { data: billing } = await adminClient
    .from('billing_processes')
    .select('service, total_service_cost')
    .gte('document_date', from)
    .lte('document_date', to)
    .not('service', 'is', null)

  if (!billing || billing.length === 0) return []

  // Aggregate by service/category
  const byCategory = new Map<string, { revenue: number; count: number }>()

  for (const b of billing) {
    const category = b.service || 'Outros'
    const current = byCategory.get(category) || { revenue: 0, count: 0 }
    byCategory.set(category, {
      revenue: current.revenue + (b.total_service_cost || 0),
      count: current.count + 1,
    })
  }

  const totalRevenue = Array.from(byCategory.values()).reduce(
    (sum, c) => sum + c.revenue,
    0
  )

  // Sort and limit
  return Array.from(byCategory.entries())
    .map(([category, data]) => ({
      category,
      avgTicket: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
      totalRevenue: data.revenue,
      count: data.count,
      percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.avgTicket - a.avgTicket)
    .slice(0, limit)
}

// ==================
// NEW: Completion Trend (Concluídos vs Cancelados)
// ==================

export async function getCompletionTrend(
  filters: AnalyticsFilters
): Promise<TrendData<CompletionTrendPoint>> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)
  const granularity = determineGranularity(from, to)

  const { data: requests } = await adminClient
    .from('service_requests')
    .select('created_at, status')
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: true })

  if (!requests || requests.length === 0) {
    return { granularity, data: [] }
  }

  // Group by period
  const byPeriod = new Map<string, { completed: number; cancelled: number; pending: number }>()

  for (const r of requests) {
    const periodKey = getPeriodKey(r.created_at.substring(0, 10), granularity)
    const current = byPeriod.get(periodKey) || { completed: 0, cancelled: 0, pending: 0 }

    // Map status to category
    const status = r.status?.toLowerCase() || ''
    if (status.includes('conclu')) {
      current.completed++
    } else if (status.includes('cancel') || status.includes('arquiv')) {
      current.cancelled++
    } else {
      current.pending++
    }

    byPeriod.set(periodKey, current)
  }

  const data = Array.from(byPeriod.entries())
    .map(([periodKey, periodData]) => {
      const total = periodData.completed + periodData.cancelled + periodData.pending
      return {
        period: periodKey,
        periodLabel: formatPeriodLabel(periodKey, granularity),
        completed: periodData.completed,
        cancelled: periodData.cancelled,
        pending: periodData.pending,
        completionRate: total > 0 ? Math.round((periodData.completed / total) * 100) : 0,
        cancellationRate: total > 0 ? Math.round((periodData.cancelled / total) * 100) : 0,
      }
    })
    .sort((a, b) => a.period.localeCompare(b.period))

  return { granularity, data }
}

// ==================
// NEW: Low Rating Providers (Alerts)
// ==================

const LOW_RATING_THRESHOLD = 3.0
const MIN_RATINGS_FOR_ALERT = 3

export async function getLowRatingProviders(
  filters: AnalyticsFilters
): Promise<LowRatingProvider[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  // Get ratings by provider
  const { data: ratings } = await adminClient
    .from('service_requests')
    .select('assigned_provider_name, service_rating, created_at')
    .gte('created_at', from)
    .lte('created_at', to)
    .gt('service_rating', 0)
    .not('assigned_provider_name', 'is', null)
    .order('created_at', { ascending: true })

  if (!ratings || ratings.length === 0) return []

  // Aggregate by provider
  const byProvider = new Map<string, {
    ratings: { value: number; date: string }[]
    sum: number
    belowThreshold: number
  }>()

  for (const r of ratings) {
    const name = r.assigned_provider_name!
    const current = byProvider.get(name) || { ratings: [], sum: 0, belowThreshold: 0 }
    current.ratings.push({ value: r.service_rating || 0, date: r.created_at })
    current.sum += r.service_rating || 0
    if ((r.service_rating || 0) < LOW_RATING_THRESHOLD) {
      current.belowThreshold++
    }
    byProvider.set(name, current)
  }

  // Get provider IDs from allocation_history
  const { data: providers } = await adminClient
    .from('allocation_history')
    .select('backoffice_provider_id, provider_name')

  const providerIdMap = new Map<string, number>()
  providers?.forEach((p) => {
    providerIdMap.set(p.provider_name.trim().toLowerCase(), p.backoffice_provider_id)
  })

  // Filter providers with low ratings
  const lowRatingProviders: LowRatingProvider[] = []

  for (const [name, data] of byProvider.entries()) {
    const avgRating = data.sum / data.ratings.length
    const percentBelow = (data.belowThreshold / data.ratings.length) * 100

    // Include if avg rating is below threshold OR significant % of ratings are low
    if (
      data.ratings.length >= MIN_RATINGS_FOR_ALERT &&
      (avgRating < LOW_RATING_THRESHOLD || percentBelow > 30)
    ) {
      // Calculate trend (compare first half vs second half)
      const midpoint = Math.floor(data.ratings.length / 2)
      const firstHalf = data.ratings.slice(0, midpoint)
      const secondHalf = data.ratings.slice(midpoint)

      const firstHalfAvg = firstHalf.length > 0
        ? firstHalf.reduce((s, r) => s + r.value, 0) / firstHalf.length
        : 0
      const secondHalfAvg = secondHalf.length > 0
        ? secondHalf.reduce((s, r) => s + r.value, 0) / secondHalf.length
        : 0

      let trend: 'improving' | 'declining' | 'stable' = 'stable'
      if (secondHalfAvg > firstHalfAvg + 0.3) trend = 'improving'
      else if (secondHalfAvg < firstHalfAvg - 0.3) trend = 'declining'

      lowRatingProviders.push({
        backofficeProviderId: providerIdMap.get(name.trim().toLowerCase()) || 0,
        providerName: name,
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: data.ratings.length,
        ratingsBelowThreshold: data.belowThreshold,
        percentBelowThreshold: Math.round(percentBelow),
        recentTrend: trend,
      })
    }
  }

  return lowRatingProviders.sort((a, b) => a.avgRating - b.avgRating)
}

// ==================
// NEW: Concentration Analysis
// ==================

export async function getConcentrationMetrics(
  filters: AnalyticsFilters
): Promise<ConcentrationMetrics> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  const { data: billing } = await adminClient
    .from('billing_processes')
    .select('assigned_provider_name, total_invoice_value')
    .gte('document_date', from)
    .lte('document_date', to)
    .not('assigned_provider_name', 'is', null)

  if (!billing || billing.length === 0) {
    return {
      topProviderShare: 0,
      top3Share: 0,
      top5Share: 0,
      herfindahlIndex: 0,
      riskLevel: 'low',
      topProviders: [],
    }
  }

  // Aggregate by provider
  const byProvider = new Map<string, number>()
  for (const b of billing) {
    const name = b.assigned_provider_name!
    byProvider.set(name, (byProvider.get(name) || 0) + (b.total_invoice_value || 0))
  }

  const totalRevenue = Array.from(byProvider.values()).reduce((a, b) => a + b, 0)
  const sorted = Array.from(byProvider.entries()).sort((a, b) => b[1] - a[1])

  // Calculate shares
  const top1Revenue = sorted[0]?.[1] || 0
  const top3Revenue = sorted.slice(0, 3).reduce((s, [, v]) => s + v, 0)
  const top5Revenue = sorted.slice(0, 5).reduce((s, [, v]) => s + v, 0)

  const topProviderShare = totalRevenue > 0 ? Math.round((top1Revenue / totalRevenue) * 100) : 0
  const top3Share = totalRevenue > 0 ? Math.round((top3Revenue / totalRevenue) * 100) : 0
  const top5Share = totalRevenue > 0 ? Math.round((top5Revenue / totalRevenue) * 100) : 0

  // Calculate HHI (Herfindahl-Hirschman Index)
  let hhi = 0
  for (const [, revenue] of sorted) {
    const share = (revenue / totalRevenue) * 100
    hhi += share * share
  }
  const herfindahlIndex = Math.round(hhi)

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  if (topProviderShare > 50 || herfindahlIndex > 2500) {
    riskLevel = 'critical'
  } else if (topProviderShare > 35 || herfindahlIndex > 1800) {
    riskLevel = 'high'
  } else if (topProviderShare > 25 || herfindahlIndex > 1000) {
    riskLevel = 'medium'
  }

  // Top providers for display
  const topProviders = sorted.slice(0, 5).map(([name, revenue]) => ({
    name,
    revenue,
    percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
  }))

  return {
    topProviderShare,
    top3Share,
    top5Share,
    herfindahlIndex,
    riskLevel,
    topProviders,
  }
}

// ==================
// NEW: Network Saturation Analysis
// ==================

export async function getNetworkSaturation(
  filters: AnalyticsFilters
): Promise<NetworkSaturationMetrics> {
  const { from, to } = getDateRange(filters)
  const { from: prevFrom, to: prevTo } = getPreviousPeriodRange(from, to)

  // Get current and previous period data
  const [currentSummary, prevSummary] = await Promise.all([
    getOperationalSummary(filters),
    getOperationalSummary({ ...filters, dateFrom: prevFrom, dateTo: prevTo }),
  ])

  // Calculate changes
  const volumeChange = calculateTrend(
    currentSummary.totalRequests,
    prevSummary.totalRequests
  )
  const acceptanceChange = calculateTrend(
    currentSummary.networkAcceptanceRate,
    prevSummary.networkAcceptanceRate
  )

  // Get completion rates for both periods
  const adminClient = createAdminClient()

  const { data: currentRequests } = await adminClient
    .from('service_requests')
    .select('status')
    .gte('created_at', from)
    .lte('created_at', to)

  const { data: prevRequests } = await adminClient
    .from('service_requests')
    .select('status')
    .gte('created_at', prevFrom)
    .lte('created_at', prevTo)

  const currentCompleted = currentRequests?.filter((r) =>
    r.status?.toLowerCase().includes('conclu')
  ).length || 0
  const currentTotal = currentRequests?.length || 0
  const prevCompleted = prevRequests?.filter((r) =>
    r.status?.toLowerCase().includes('conclu')
  ).length || 0
  const prevTotal = prevRequests?.length || 0

  const currentCompletionRate = currentTotal > 0 ? (currentCompleted / currentTotal) * 100 : 0
  const prevCompletionRate = prevTotal > 0 ? (prevCompleted / prevTotal) * 100 : 0
  const qualityChange = calculateTrend(currentCompletionRate, prevCompletionRate)

  // Calculate expiration change
  const expirationChange = -acceptanceChange // Inverse of acceptance

  // Calculate correlation score
  // Negative correlation: volume up + quality down = bad
  let correlationScore = 0
  if (volumeChange > 10 && qualityChange < -5) {
    correlationScore = -Math.min((volumeChange * Math.abs(qualityChange)) / 100, 1)
  } else if (volumeChange > 10 && qualityChange > 0) {
    correlationScore = Math.min((volumeChange * qualityChange) / 100, 1)
  }

  // Determine status and alerts
  const alerts: string[] = []
  let status: 'healthy' | 'warning' | 'saturated' = 'healthy'

  if (volumeChange > 20 && qualityChange < -10) {
    status = 'saturated'
    alerts.push(`Volume aumentou ${volumeChange}% mas conclusão caiu ${Math.abs(qualityChange)}%`)
  } else if (volumeChange > 15 && acceptanceChange < -5) {
    status = 'warning'
    alerts.push(`Volume cresceu ${volumeChange}% e aceitação desceu ${Math.abs(acceptanceChange)}%`)
  }

  if (expirationChange > 15) {
    alerts.push(`Taxa de expiração subiu ${expirationChange}%`)
    if (status === 'healthy') status = 'warning'
  }

  if (currentSummary.atRiskProvidersCount > currentSummary.totalActiveProviders * 0.3) {
    alerts.push(`${currentSummary.atRiskProvidersCount} de ${currentSummary.totalActiveProviders} prestadores em risco`)
    if (status !== 'saturated') status = 'warning'
  }

  return {
    volumeChange,
    qualityChange: Math.round(qualityChange),
    acceptanceChange,
    expirationChange,
    correlationScore: Math.round(correlationScore * 100) / 100,
    status,
    alerts,
  }
}

// ==================
// NEW: Coverage Gaps Analysis
// ==================

export async function getCoverageGaps(
  filters: AnalyticsFilters
): Promise<CoverageGapItem[]> {
  const adminClient = createAdminClient()
  const { from, to } = getDateRange(filters)

  // Get service requests by district
  const { data: requests } = await adminClient
    .from('service_requests')
    .select('client_district, status, assigned_provider_name')
    .gte('created_at', from)
    .lte('created_at', to)
    .not('client_district', 'is', null)

  // Get allocation data for expiration/acceptance
  const { data: allocations } = await adminClient
    .from('allocation_history')
    .select('*')
    .gte('period_from', from)
    .lte('period_to', to)

  if (!requests || requests.length === 0) return []

  // Aggregate requests by district
  const byDistrict = new Map<string, {
    total: number
    providers: Set<string>
    completed: number
    cancelled: number
    expired: number
    accepted: number
    received: number
  }>()

  for (const r of requests) {
    const district = r.client_district!
    const current = byDistrict.get(district) || {
      total: 0,
      providers: new Set(),
      completed: 0,
      cancelled: 0,
      expired: 0,
      accepted: 0,
      received: 0,
    }

    current.total++
    if (r.assigned_provider_name) {
      current.providers.add(r.assigned_provider_name)
    }

    const status = r.status?.toLowerCase() || ''
    if (status.includes('conclu')) current.completed++
    if (status.includes('cancel') || status.includes('arquiv')) current.cancelled++

    byDistrict.set(district, current)
  }

  // Add allocation metrics (aggregate across providers in each district)
  // Note: This is an approximation since allocation_history doesn't have district info
  // We'll use the overall network metrics per district based on assigned providers

  // Build district metrics
  const gaps: CoverageGapItem[] = []

  for (const [district, data] of byDistrict.entries()) {
    const providersCount = data.providers.size
    const expirationRate = data.total > 0
      ? Math.round(((data.total - data.completed - data.cancelled) / data.total) * 100)
      : 0
    const acceptanceRate = data.total > 0
      ? Math.round((data.completed / data.total) * 100)
      : 0

    // Determine issues and risk level
    const issues: string[] = []
    let riskLevel: 'ok' | 'warning' | 'critical' = 'ok'

    if (providersCount === 0) {
      issues.push('Sem prestadores atribuídos')
      riskLevel = 'critical'
    } else if (providersCount === 1) {
      issues.push('Apenas 1 prestador (risco de dependência)')
      riskLevel = 'warning'
    }

    if (expirationRate > 30) {
      issues.push(`Alta taxa de não-conclusão (${expirationRate}%)`)
      riskLevel = 'critical'
    } else if (expirationRate > 20) {
      issues.push(`Taxa de não-conclusão elevada (${expirationRate}%)`)
      if (riskLevel !== 'critical') riskLevel = 'warning'
    }

    if (data.total >= 10 && acceptanceRate < 50) {
      issues.push(`Baixa taxa de conclusão (${acceptanceRate}%)`)
      if (riskLevel !== 'critical') riskLevel = 'warning'
    }

    gaps.push({
      district,
      totalRequests: data.total,
      providersCount,
      expirationRate,
      acceptanceRate,
      avgResponseTime: null,
      riskLevel,
      issues,
    })
  }

  // Sort by risk (critical first, then warning, then ok) and then by volume
  return gaps
    .sort((a, b) => {
      const riskOrder = { critical: 0, warning: 1, ok: 2 }
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
      }
      return b.totalRequests - a.totalRequests
    })
}
