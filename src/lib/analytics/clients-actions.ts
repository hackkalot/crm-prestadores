'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AnalyticsFilters,
  TrendGranularity,
  ClientsSummary,
  ClientRegistrationTrendPoint,
  ClientStatusItem,
  ClientRequestBucket,
  ClientPlatformItem,
  TopClient,
  ClientCityItem,
} from './types'

/**
 * Get effective date range for clients, applying defaults (current month) when not set.
 * Mirrors the behaviour of getDateRange() in actions.ts.
 */
function getClientDateRange(filters?: AnalyticsFilters): { from: string; to: string } {
  const now = new Date()

  // Default: first day of the current month
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const fromDate = filters?.dateFrom || defaultFrom.toISOString().split('T')[0]

  // Default: today
  const toDate = filters?.dateTo || now.toISOString().split('T')[0]

  return { from: fromDate, to: toDate }
}

/**
 * Helper: build a filtered clients query.
 * Always applies a date range on `registration` (defaults to current month).
 */
function applyClientDateFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters?: AnalyticsFilters
) {
  const { from, to } = getClientDateRange(filters)

  query = query.gte('registration', from)

  // Add one day to 'to' to include the full day
  const toDate = new Date(to)
  toDate.setDate(toDate.getDate() + 1)
  query = query.lt('registration', toDate.toISOString().split('T')[0])

  return query
}

/**
 * Determine granularity based on date range span
 */
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
      return dateStr.substring(0, 10) // YYYY-MM-DD
    case 'week':
      return `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
}

function formatPeriodLabel(periodKey: string, granularity: TrendGranularity): string {
  switch (granularity) {
    case 'day': {
      const date = new Date(periodKey)
      return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
    }
    case 'week': {
      const [, week] = periodKey.split('-W')
      return `S${week}`
    }
    case 'month': {
      const [year, month] = periodKey.split('-')
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      return `${monthNames[parseInt(month) - 1]} ${year}`
    }
  }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeClientMetrics(clients: any[], referenceDate: Date) {
  const totalClients = clients.length

  // Active clients: last_request within 6 months from referenceDate
  const sixMonthsAgo = new Date(referenceDate)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixMonthsAgoISO = sixMonthsAgo.toISOString()

  const activeClients = clients.filter(c =>
    c.last_request && c.last_request >= sixMonthsAgoISO
  ).length

  // Average payment per client (only clients with payments)
  const clientsWithPayments = clients.filter(c => (c.total_payments || 0) > 0)
  const totalPayments = clientsWithPayments.reduce((sum, c) => sum + (c.total_payments || 0), 0)
  const avgPaymentPerClient = clientsWithPayments.length > 0
    ? Math.round(totalPayments / clientsWithPayments.length)
    : 0

  // Recurrencies
  const totalRecurrenciesActive = clients.reduce((sum, c) => sum + (c.active_overall_recurrencies || 0), 0)
  const clientsWithRecurrencies = clients.filter(c => (c.active_overall_recurrencies || 0) > 0).length

  // Wallets - count clients with positive wallet balance
  const walletsWithBalance = clients.filter(c => (c.current_wallet_amount || 0) > 0)
  const walletsActive = walletsWithBalance.length
  const avgWalletBalance = walletsActive > 0
    ? Math.round(walletsWithBalance.reduce((sum, c) => sum + (c.current_wallet_amount || 0), 0) / walletsActive)
    : 0

  return {
    totalClients,
    activeClients,
    activeClientsPercentage: totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0,
    avgPaymentPerClient,
    totalRecurrenciesActive,
    clientsWithRecurrencies,
    clientsWithRecurrenciesPercentage: totalClients > 0 ? Math.round((clientsWithRecurrencies / totalClients) * 100) : 0,
    walletsActive,
    walletsActivePercentage: totalClients > 0 ? Math.round((walletsActive / totalClients) * 100) : 0,
    avgWalletBalance,
  }
}

const emptyClientsSummary: ClientsSummary = {
  totalClients: 0,
  totalClientsPrev: 0,
  totalClientsTrend: 0,
  activeClients: 0,
  activeClientsPercentage: 0,
  activeClientsPrev: 0,
  activeClientsTrend: 0,
  avgPaymentPerClient: 0,
  avgPaymentPerClientPrev: 0,
  avgPaymentPerClientTrend: 0,
  totalRecurrenciesActive: 0,
  clientsWithRecurrencies: 0,
  clientsWithRecurrenciesPercentage: 0,
  totalRecurrenciesActivePrev: 0,
  totalRecurrenciesActiveTrend: 0,
  walletsActive: 0,
  walletsActivePercentage: 0,
  walletsActivePrev: 0,
  walletsActiveTrend: 0,
  avgWalletBalance: 0,
}

/**
 * Get clients summary KPIs
 */
export async function getClientsSummary(filters?: AnalyticsFilters): Promise<ClientsSummary> {
  const adminClient = createAdminClient()
  const selectFields = 'total_requests, total_payments, last_request, active_overall_recurrencies, wallet_is_active, current_wallet_amount, registration'

  // Current period
  let query = adminClient.from('clients').select(selectFields)
  query = applyClientDateFilters(query, filters)
  const { data: clients } = await query

  if (!clients || clients.length === 0) {
    return { ...emptyClientsSummary }
  }

  // Use the end date of the filter range as reference for "active" calculation
  const effectiveRange = getClientDateRange(filters)
  const currentReferenceDate = new Date(effectiveRange.to)

  const current = computeClientMetrics(clients, currentReferenceDate)

  // Previous period (always computed using effective date range with defaults)
  let prevMetrics = {
    totalClients: 0,
    activeClients: 0,
    avgPaymentPerClient: 0,
    totalRecurrenciesActive: 0,
    walletsActive: 0,
  }

  const prevRange = getPreviousPeriodRange(effectiveRange.from, effectiveRange.to)
  const prevFilters: AnalyticsFilters = { ...filters, dateFrom: prevRange.from, dateTo: prevRange.to }
  const prevReferenceDate = new Date(prevRange.to)

  let prevQuery = adminClient.from('clients').select(selectFields)
  prevQuery = applyClientDateFilters(prevQuery, prevFilters)
  const { data: prevClients } = await prevQuery

  if (prevClients && prevClients.length > 0) {
    const prev = computeClientMetrics(prevClients, prevReferenceDate)
    prevMetrics = {
      totalClients: prev.totalClients,
      activeClients: prev.activeClients,
      avgPaymentPerClient: prev.avgPaymentPerClient,
      totalRecurrenciesActive: prev.totalRecurrenciesActive,
      walletsActive: prev.walletsActive,
    }
  }

  return {
    ...current,
    totalClientsPrev: prevMetrics.totalClients,
    totalClientsTrend: calculateTrend(current.totalClients, prevMetrics.totalClients),
    activeClientsPrev: prevMetrics.activeClients,
    activeClientsTrend: calculateTrend(current.activeClients, prevMetrics.activeClients),
    avgPaymentPerClientPrev: prevMetrics.avgPaymentPerClient,
    avgPaymentPerClientTrend: calculateTrend(current.avgPaymentPerClient, prevMetrics.avgPaymentPerClient),
    totalRecurrenciesActivePrev: prevMetrics.totalRecurrenciesActive,
    totalRecurrenciesActiveTrend: calculateTrend(current.totalRecurrenciesActive, prevMetrics.totalRecurrenciesActive),
    walletsActivePrev: prevMetrics.walletsActive,
    walletsActiveTrend: calculateTrend(current.walletsActive, prevMetrics.walletsActive),
  }
}

/**
 * Get client registration trend over time (granularity adapts to date range)
 */
export async function getClientRegistrationTrend(filters?: AnalyticsFilters): Promise<ClientRegistrationTrendPoint[]> {
  const adminClient = createAdminClient()

  let query = adminClient
    .from('clients')
    .select('registration')
    .not('registration', 'is', null)
    .order('registration', { ascending: true })

  query = applyClientDateFilters(query, filters)

  const { data: clients } = await query

  if (!clients || clients.length === 0) return []

  // Determine granularity from effective date range
  const effectiveRange = getClientDateRange(filters)
  const granularity = determineGranularity(effectiveRange.from, effectiveRange.to)

  // Group by dynamic period
  const byPeriod = new Map<string, number>()

  for (const client of clients) {
    if (!client.registration) continue
    const date = new Date(client.registration)
    if (isNaN(date.getTime())) continue

    const key = getPeriodKey(client.registration, granularity)
    byPeriod.set(key, (byPeriod.get(key) || 0) + 1)
  }

  // Build trend with cumulative total
  const sortedPeriods = Array.from(byPeriod.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  let cumulative = 0
  const trend: ClientRegistrationTrendPoint[] = sortedPeriods.map(([period, count]) => {
    cumulative += count

    return {
      period,
      periodLabel: formatPeriodLabel(period, granularity),
      newClients: count,
      cumulativeTotal: cumulative,
    }
  })

  return trend
}

/**
 * Get client distribution by activity status
 * Uses the same definition as the "Clientes Ativos" card:
 * - Ativo: last_request within the last 6 months from filter end date
 * - Inativo: last_request older than 6 months or null
 */
export async function getClientStatusDistribution(filters?: AnalyticsFilters): Promise<ClientStatusItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient
    .from('clients')
    .select('last_request, registration')

  query = applyClientDateFilters(query, filters)

  const { data: clients } = await query

  if (!clients || clients.length === 0) return []

  const total = clients.length

  // Same definition as card: active = last_request within 6 months from filter end date
  const effectiveRange = getClientDateRange(filters)
  const referenceDate = new Date(effectiveRange.to)
  const sixMonthsAgo = new Date(referenceDate)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixMonthsAgoISO = sixMonthsAgo.toISOString()

  let activeCount = 0
  let inactiveCount = 0

  for (const client of clients) {
    if (client.last_request && client.last_request >= sixMonthsAgoISO) {
      activeCount++
    } else {
      inactiveCount++
    }
  }

  const result: ClientStatusItem[] = []

  if (activeCount > 0) {
    result.push({
      status: 'Ativo',
      count: activeCount,
      percentage: Math.round((activeCount / total) * 100),
    })
  }

  if (inactiveCount > 0) {
    result.push({
      status: 'Inativo',
      count: inactiveCount,
      percentage: Math.round((inactiveCount / total) * 100),
    })
  }

  return result.sort((a, b) => b.count - a.count)
}

/**
 * Get client distribution by number of requests (bucketed)
 */
export async function getClientRequestDistribution(filters?: AnalyticsFilters): Promise<ClientRequestBucket[]> {
  const adminClient = createAdminClient()

  let query = adminClient
    .from('clients')
    .select('total_requests, registration')

  query = applyClientDateFilters(query, filters)

  const { data: clients } = await query

  if (!clients || clients.length === 0) return []

  const total = clients.length
  const buckets = new Map<string, number>([
    ['0', 0],
    ['1', 0],
    ['2-5', 0],
    ['6-10', 0],
    ['11-20', 0],
    ['21+', 0],
  ])

  for (const client of clients) {
    const requests = client.total_requests || 0
    if (requests === 0) buckets.set('0', (buckets.get('0') || 0) + 1)
    else if (requests === 1) buckets.set('1', (buckets.get('1') || 0) + 1)
    else if (requests <= 5) buckets.set('2-5', (buckets.get('2-5') || 0) + 1)
    else if (requests <= 10) buckets.set('6-10', (buckets.get('6-10') || 0) + 1)
    else if (requests <= 20) buckets.set('11-20', (buckets.get('11-20') || 0) + 1)
    else buckets.set('21+', (buckets.get('21+') || 0) + 1)
  }

  return Array.from(buckets.entries()).map(([bucket, count]) => ({
    bucket,
    count,
    percentage: Math.round((count / total) * 100),
  }))
}

/**
 * Get client distribution by registration platform
 */
export async function getClientPlatformDistribution(filters?: AnalyticsFilters): Promise<ClientPlatformItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient
    .from('clients')
    .select('device_platform_customer_registration, registration')

  query = applyClientDateFilters(query, filters)

  const { data: clients } = await query

  if (!clients || clients.length === 0) return []

  const total = clients.length
  const byPlatform = new Map<string, number>()

  for (const client of clients) {
    const platform = client.device_platform_customer_registration || 'Desconhecido'
    byPlatform.set(platform, (byPlatform.get(platform) || 0) + 1)
  }

  return Array.from(byPlatform.entries())
    .map(([platform, count]) => ({
      platform,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Get top clients by total requests
 */
export async function getTopClients(limit: number = 10, filters?: AnalyticsFilters): Promise<TopClient[]> {
  const adminClient = createAdminClient()

  let query = adminClient
    .from('clients')
    .select('name, surname, city, total_requests, completed_requests, total_payments, registration')
    .order('total_requests', { ascending: false })
    .limit(limit)

  query = applyClientDateFilters(query, filters)

  const { data: clients } = await query

  if (!clients || clients.length === 0) return []

  return clients.map((client, index) => ({
    rank: index + 1,
    name: [client.name, client.surname].filter(Boolean).join(' ') || 'Sem nome',
    city: client.city || null,
    totalRequests: client.total_requests || 0,
    completedRequests: client.completed_requests || 0,
    totalPayments: client.total_payments || 0,
  }))
}

/**
 * Get clients grouped by city
 */
export async function getClientsByCity(limit: number = 15, filters?: AnalyticsFilters): Promise<ClientCityItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient
    .from('clients')
    .select('city, registration')

  query = applyClientDateFilters(query, filters)

  const { data: clients } = await query

  if (!clients || clients.length === 0) return []

  const total = clients.length
  const byCity = new Map<string, number>()

  for (const client of clients) {
    const city = client.city?.trim()
    if (!city) continue
    byCity.set(city, (byCity.get(city) || 0) + 1)
  }

  return Array.from(byCity.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([city, count]) => ({
      city,
      count,
      percentage: Math.round((count / total) * 100),
    }))
}
