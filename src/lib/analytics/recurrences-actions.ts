'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AnalyticsFilters,
  TrendGranularity,
  RecurrencesSummary,
  RecurrenceTrendPoint,
  RecurrenceStatusItem,
  RecurrenceServiceItem,
  RecurrenceTypeItem,
  InactivationReasonItem,
  RecurrenceDistrictItem,
} from './types'

// ==================
// Helpers
// ==================

function getRecurrenceDateRange(filters?: AnalyticsFilters): { from: string; to: string } {
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const fromDate = filters?.dateFrom || defaultFrom.toISOString().split('T')[0]
  const toDate = filters?.dateTo || now.toISOString().split('T')[0]
  return { from: fromDate, to: toDate }
}

function applyRecurrenceDateFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters?: AnalyticsFilters
) {
  const { from, to } = getRecurrenceDateRange(filters)
  query = query.gte('submission_date', from)
  const toDate = new Date(to)
  toDate.setDate(toDate.getDate() + 1)
  query = query.lt('submission_date', toDate.toISOString().split('T')[0])
  return query
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
      return dateStr.substring(0, 10)
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

function getMostFrequent(items: string[]): string | null {
  if (items.length === 0) return null
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1)
  }
  let max = 0
  let result: string | null = null
  for (const [key, count] of counts) {
    if (count > max) {
      max = count
      result = key
    }
  }
  return result
}

// ==================
// Server Actions
// ==================

const emptyRecurrencesSummary: RecurrencesSummary = {
  totalRecurrences: 0,
  totalRecurrencesPrev: 0,
  totalRecurrencesTrend: 0,
  activeRecurrences: 0,
  activeRecurrencesPrev: 0,
  activeRecurrencesTrend: 0,
  activePercentage: 0,
  inactivationRate: 0,
  inactivationRatePrev: 0,
  inactivationRateTrend: 0,
  inactivatedCount: 0,
  distinctServices: 0,
  distinctServicesPrev: 0,
  distinctServicesTrend: 0,
  topService: null,
  distinctDistricts: 0,
  distinctDistrictsPrev: 0,
  distinctDistrictsTrend: 0,
  topDistrict: null,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeRecurrenceMetrics(recurrences: any[]) {
  const total = recurrences.length
  const active = recurrences.filter(r => {
    const status = r.recurrence_status?.toLowerCase()
    return status === 'ativa' || status === 'active'
  }).length
  const inactive = total - active

  const services = recurrences.map(r => r.service).filter(Boolean) as string[]
  const districts = recurrences.map(r => r.address_district).filter(Boolean) as string[]

  return {
    total,
    active,
    inactive,
    activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
    inactivationRate: total > 0 ? Math.round((inactive / total) * 100) : 0,
    distinctServices: new Set(services).size,
    topService: getMostFrequent(services),
    distinctDistricts: new Set(districts).size,
    topDistrict: getMostFrequent(districts),
  }
}

export async function getRecurrencesSummary(filters?: AnalyticsFilters): Promise<RecurrencesSummary> {
  const adminClient = createAdminClient()
  const selectFields = 'recurrence_status, service, address_district, submission_date'

  // Current period
  let query = adminClient.from('recurrences').select(selectFields)
  query = applyRecurrenceDateFilters(query, filters)
  const { data: recurrences } = await query

  if (!recurrences || recurrences.length === 0) {
    return { ...emptyRecurrencesSummary }
  }

  const current = computeRecurrenceMetrics(recurrences)

  // Previous period
  let prevMetrics = { total: 0, active: 0, inactivationRate: 0, distinctServices: 0, distinctDistricts: 0 }

  const effectiveRange = getRecurrenceDateRange(filters)
  const prevRange = getPreviousPeriodRange(effectiveRange.from, effectiveRange.to)
  const prevFilters: AnalyticsFilters = { ...filters, dateFrom: prevRange.from, dateTo: prevRange.to }

  let prevQuery = adminClient.from('recurrences').select(selectFields)
  prevQuery = applyRecurrenceDateFilters(prevQuery, prevFilters)
  const { data: prevRecurrences } = await prevQuery

  if (prevRecurrences && prevRecurrences.length > 0) {
    const prev = computeRecurrenceMetrics(prevRecurrences)
    prevMetrics = {
      total: prev.total,
      active: prev.active,
      inactivationRate: prev.inactivationRate,
      distinctServices: prev.distinctServices,
      distinctDistricts: prev.distinctDistricts,
    }
  }

  return {
    totalRecurrences: current.total,
    totalRecurrencesPrev: prevMetrics.total,
    totalRecurrencesTrend: calculateTrend(current.total, prevMetrics.total),
    activeRecurrences: current.active,
    activeRecurrencesPrev: prevMetrics.active,
    activeRecurrencesTrend: calculateTrend(current.active, prevMetrics.active),
    activePercentage: current.activePercentage,
    inactivationRate: current.inactivationRate,
    inactivationRatePrev: prevMetrics.inactivationRate,
    inactivationRateTrend: calculateTrend(current.inactivationRate, prevMetrics.inactivationRate),
    inactivatedCount: current.inactive,
    distinctServices: current.distinctServices,
    distinctServicesPrev: prevMetrics.distinctServices,
    distinctServicesTrend: calculateTrend(current.distinctServices, prevMetrics.distinctServices),
    topService: current.topService,
    distinctDistricts: current.distinctDistricts,
    distinctDistrictsPrev: prevMetrics.distinctDistricts,
    distinctDistrictsTrend: calculateTrend(current.distinctDistricts, prevMetrics.distinctDistricts),
    topDistrict: current.topDistrict,
  }
}

export async function getRecurrenceTrend(filters?: AnalyticsFilters): Promise<RecurrenceTrendPoint[]> {
  const adminClient = createAdminClient()

  let query = adminClient
    .from('recurrences')
    .select('submission_date')
    .not('submission_date', 'is', null)
    .order('submission_date', { ascending: true })

  query = applyRecurrenceDateFilters(query, filters)
  const { data: recurrences } = await query

  if (!recurrences || recurrences.length === 0) return []

  const effectiveRange = getRecurrenceDateRange(filters)
  const granularity = determineGranularity(effectiveRange.from, effectiveRange.to)

  const byPeriod = new Map<string, number>()
  for (const r of recurrences) {
    if (!r.submission_date) continue
    const date = new Date(r.submission_date)
    if (isNaN(date.getTime())) continue
    const key = getPeriodKey(r.submission_date, granularity)
    byPeriod.set(key, (byPeriod.get(key) || 0) + 1)
  }

  const sortedPeriods = Array.from(byPeriod.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  let cumulative = 0
  return sortedPeriods.map(([period, count]) => {
    cumulative += count
    return {
      period,
      periodLabel: formatPeriodLabel(period, granularity),
      newRecurrences: count,
      cumulativeTotal: cumulative,
    }
  })
}

export async function getRecurrenceStatusDistribution(filters?: AnalyticsFilters): Promise<RecurrenceStatusItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient.from('recurrences').select('recurrence_status, submission_date')
  query = applyRecurrenceDateFilters(query, filters)
  const { data: recurrences } = await query

  if (!recurrences || recurrences.length === 0) return []

  const total = recurrences.length
  const byStatus = new Map<string, number>()
  for (const r of recurrences) {
    const status = r.recurrence_status || 'Desconhecido'
    byStatus.set(status, (byStatus.get(status) || 0) + 1)
  }

  return Array.from(byStatus.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getRecurrencesByService(limit: number = 10, filters?: AnalyticsFilters): Promise<RecurrenceServiceItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient.from('recurrences').select('service, submission_date')
  query = applyRecurrenceDateFilters(query, filters)
  const { data: recurrences } = await query

  if (!recurrences || recurrences.length === 0) return []

  const total = recurrences.length
  const byService = new Map<string, number>()
  for (const r of recurrences) {
    const service = r.service?.trim()
    if (!service) continue
    byService.set(service, (byService.get(service) || 0) + 1)
  }

  return Array.from(byService.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([service, count]) => ({
      service,
      count,
      percentage: Math.round((count / total) * 100),
    }))
}

export async function getRecurrenceTypeDistribution(filters?: AnalyticsFilters): Promise<RecurrenceTypeItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient.from('recurrences').select('recurrence_type, submission_date')
  query = applyRecurrenceDateFilters(query, filters)
  const { data: recurrences } = await query

  if (!recurrences || recurrences.length === 0) return []

  const total = recurrences.length
  const byType = new Map<string, number>()
  for (const r of recurrences) {
    const type = r.recurrence_type || 'Desconhecido'
    byType.set(type, (byType.get(type) || 0) + 1)
  }

  return Array.from(byType.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getInactivationReasons(limit: number = 10, filters?: AnalyticsFilters): Promise<InactivationReasonItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient
    .from('recurrences')
    .select('inactivation_reason, submission_date')
    .not('inactivation_reason', 'is', null)

  query = applyRecurrenceDateFilters(query, filters)
  const { data: recurrences } = await query

  if (!recurrences || recurrences.length === 0) return []

  const total = recurrences.length
  const byReason = new Map<string, number>()
  for (const r of recurrences) {
    const reason = r.inactivation_reason?.trim()
    if (!reason) continue
    byReason.set(reason, (byReason.get(reason) || 0) + 1)
  }

  return Array.from(byReason.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / total) * 100),
    }))
}

export async function getRecurrencesByDistrict(limit: number = 15, filters?: AnalyticsFilters): Promise<RecurrenceDistrictItem[]> {
  const adminClient = createAdminClient()

  let query = adminClient.from('recurrences').select('address_district, submission_date')
  query = applyRecurrenceDateFilters(query, filters)
  const { data: recurrences } = await query

  if (!recurrences || recurrences.length === 0) return []

  const total = recurrences.length
  const byDistrict = new Map<string, number>()
  for (const r of recurrences) {
    const district = r.address_district?.trim()
    if (!district) continue
    byDistrict.set(district, (byDistrict.get(district) || 0) + 1)
  }

  return Array.from(byDistrict.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([district, count]) => ({
      district,
      count,
      percentage: Math.round((count / total) * 100),
    }))
}
