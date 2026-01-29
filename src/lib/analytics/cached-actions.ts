'use server'

import { unstable_cache } from 'next/cache'
import type { AnalyticsFilters, RankingMetric } from './types'

// Import all the original actions
import {
  getOperationalSummary,
  getServicesByStatus,
  getAtRiskProviders,
  getNetworkHealthData,
  getResponseTimeDistribution,
  getAcceptanceTrend,
  getProviderRanking,
  getVolumeDistribution,
  getRevenueByCategory,
  getTicketTrend,
  getTicketByCategory,
  getPaymentStatusBreakdown,
  getRatingTrend,
  getCompletionByCategory,
  getRatingByCategory,
  getCompletionTrend,
  getLowRatingProviders,
  getConcentrationMetrics,
  getNetworkSaturation,
  getCoverageGaps,
  getNetworkKPIs,
  getReschedulesByProvider,
  getAdditionalVisitsByProvider,
  getAnalyticsFilterOptions,
} from './actions'

import {
  getClientsSummary,
  getClientRegistrationTrend,
  getClientStatusDistribution,
  getClientRequestDistribution,
  getClientPlatformDistribution,
  getTopClients,
  getClientsByCity,
} from './clients-actions'

import {
  getRecurrencesSummary,
  getRecurrenceTrend,
  getRecurrenceStatusDistribution,
  getRecurrencesByService,
  getRecurrenceTypeDistribution,
  getInactivationReasons,
  getRecurrencesByDistrict,
} from './recurrences-actions'

import {
  getTasksSummary,
  getTaskTrend,
  getTaskStatusDistribution,
  getTasksByType,
  getTasksByAssignee,
  getTaskCompletionTime,
  getTasksByProvider,
  getTaskDeadlineCompliance,
} from './tasks-actions'

// Cache duration in seconds (5 minutes)
const CACHE_DURATION = 300

// Helper to create a stable cache key from filters
function getFilterKey(filters: AnalyticsFilters): string {
  return JSON.stringify({
    dateFrom: filters.dateFrom || 'default',
    dateTo: filters.dateTo || 'default',
    district: filters.district || 'all',
    category: filters.category || 'all',
    service: filters.service || 'all',
  })
}

// ==================
// Overview & Operational Tab
// ==================

export const getCachedOperationalSummary = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getOperationalSummary(filters),
    ['operational-summary', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedServicesByStatus = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getServicesByStatus(filters),
    ['services-by-status', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedAtRiskProviders = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getAtRiskProviders(filters),
    ['at-risk-providers', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedNetworkHealthData = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getNetworkHealthData(filters),
    ['network-health-data', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedResponseTimeDistribution = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getResponseTimeDistribution(filters),
    ['response-time-distribution', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedNetworkSaturation = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getNetworkSaturation(filters),
    ['network-saturation', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedCoverageGaps = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getCoverageGaps(filters),
    ['coverage-gaps', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

// ==================
// Network Tab
// ==================

export const getCachedNetworkKPIs = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getNetworkKPIs(filters),
    ['network-kpis', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedAcceptanceTrend = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getAcceptanceTrend(filters),
    ['acceptance-trend', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedProviderRanking = async (
  filters: AnalyticsFilters,
  metric: RankingMetric,
  limit: number = 10,
  order: 'asc' | 'desc' = 'desc'
) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getProviderRanking(filters, metric, limit, order),
    ['provider-ranking', filterKey, metric, String(limit), order],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedVolumeDistribution = async (filters: AnalyticsFilters, limit: number = 10) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getVolumeDistribution(filters, limit),
    ['volume-distribution', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedReschedulesByProvider = async (filters: AnalyticsFilters, limit: number = 10) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getReschedulesByProvider(filters, limit),
    ['reschedules-by-provider', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedAdditionalVisitsByProvider = async (filters: AnalyticsFilters, limit: number = 10) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getAdditionalVisitsByProvider(filters, limit),
    ['additional-visits-by-provider', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

// ==================
// Financial Tab
// ==================

export const getCachedRevenueByCategory = async (filters: AnalyticsFilters, limit: number = 10) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getRevenueByCategory(filters, limit),
    ['revenue-by-category', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedTicketTrend = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getTicketTrend(filters),
    ['ticket-trend', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedTicketByCategory = async (filters: AnalyticsFilters, limit: number = 10) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getTicketByCategory(filters, limit),
    ['ticket-by-category', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedPaymentStatusBreakdown = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getPaymentStatusBreakdown(filters),
    ['payment-status-breakdown', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedConcentrationMetrics = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getConcentrationMetrics(filters),
    ['concentration-metrics', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

// ==================
// Quality Tab
// ==================

export const getCachedRatingTrend = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getRatingTrend(filters),
    ['rating-trend', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedCompletionByCategory = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getCompletionByCategory(filters),
    ['completion-by-category', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedRatingByCategory = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getRatingByCategory(filters),
    ['rating-by-category', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedCompletionTrend = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getCompletionTrend(filters),
    ['completion-trend', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedLowRatingProviders = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getLowRatingProviders(filters),
    ['low-rating-providers', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

// ==================
// Clients Tab
// ==================

export const getCachedClientsSummary = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getClientsSummary(filters),
    ['clients-summary', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedClientRegistrationTrend = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getClientRegistrationTrend(filters),
    ['client-registration-trend', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedClientStatusDistribution = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getClientStatusDistribution(filters),
    ['client-status-distribution', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedClientRequestDistribution = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getClientRequestDistribution(filters),
    ['client-request-distribution', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedClientPlatformDistribution = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getClientPlatformDistribution(filters),
    ['client-platform-distribution', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedTopClients = async (limit: number = 10, filters?: AnalyticsFilters) => {
  const filterKey = filters ? getFilterKey(filters) : 'no-filters'
  return unstable_cache(
    async () => getTopClients(limit, filters),
    ['top-clients', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedClientsByCity = async (limit: number = 15, filters?: AnalyticsFilters) => {
  const filterKey = filters ? getFilterKey(filters) : 'no-filters'
  return unstable_cache(
    async () => getClientsByCity(limit, filters),
    ['clients-by-city', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

// ==================
// Recurrences Tab
// ==================

export const getCachedRecurrencesSummary = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getRecurrencesSummary(filters),
    ['recurrences-summary', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedRecurrenceTrend = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getRecurrenceTrend(filters),
    ['recurrence-trend', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedRecurrenceStatusDistribution = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getRecurrenceStatusDistribution(filters),
    ['recurrence-status-distribution', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedRecurrencesByService = async (limit: number = 10, filters?: AnalyticsFilters) => {
  const filterKey = filters ? getFilterKey(filters) : 'no-filters'
  return unstable_cache(
    async () => getRecurrencesByService(limit, filters),
    ['recurrences-by-service', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedRecurrenceTypeDistribution = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getRecurrenceTypeDistribution(filters),
    ['recurrence-type-distribution', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedInactivationReasons = async (limit: number = 10, filters?: AnalyticsFilters) => {
  const filterKey = filters ? getFilterKey(filters) : 'no-filters'
  return unstable_cache(
    async () => getInactivationReasons(limit, filters),
    ['inactivation-reasons', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedRecurrencesByDistrict = async (limit: number = 15, filters?: AnalyticsFilters) => {
  const filterKey = filters ? getFilterKey(filters) : 'no-filters'
  return unstable_cache(
    async () => getRecurrencesByDistrict(limit, filters),
    ['recurrences-by-district', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

// ==================
// Tasks Tab
// ==================

export const getCachedTasksSummary = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getTasksSummary(filters),
    ['tasks-summary', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedTaskTrend = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getTaskTrend(filters),
    ['task-trend', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedTaskStatusDistribution = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getTaskStatusDistribution(filters),
    ['task-status-distribution', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedTasksByType = async (limit: number = 10, filters?: AnalyticsFilters) => {
  const filterKey = filters ? getFilterKey(filters) : 'no-filters'
  return unstable_cache(
    async () => getTasksByType(limit, filters),
    ['tasks-by-type', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedTasksByAssignee = async (limit: number = 10, filters?: AnalyticsFilters) => {
  const filterKey = filters ? getFilterKey(filters) : 'no-filters'
  return unstable_cache(
    async () => getTasksByAssignee(limit, filters),
    ['tasks-by-assignee', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedTaskCompletionTime = async (limit: number = 10, filters?: AnalyticsFilters) => {
  const filterKey = filters ? getFilterKey(filters) : 'no-filters'
  return unstable_cache(
    async () => getTaskCompletionTime(limit, filters),
    ['task-completion-time', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedTasksByProvider = async (limit: number = 15, filters?: AnalyticsFilters) => {
  const filterKey = filters ? getFilterKey(filters) : 'no-filters'
  return unstable_cache(
    async () => getTasksByProvider(limit, filters),
    ['tasks-by-provider', filterKey, String(limit)],
    { revalidate: CACHE_DURATION }
  )()
}

export const getCachedTaskDeadlineCompliance = async (filters: AnalyticsFilters) => {
  const filterKey = getFilterKey(filters)
  return unstable_cache(
    async () => getTaskDeadlineCompliance(filters),
    ['task-deadline-compliance', filterKey],
    { revalidate: CACHE_DURATION }
  )()
}

// ==================
// Filter Options (longer cache - 15 minutes)
// ==================

export const getCachedAnalyticsFilterOptions = async () => {
  return unstable_cache(
    async () => getAnalyticsFilterOptions(),
    ['analytics-filter-options'],
    { revalidate: 900 } // 15 minutes - options change less frequently
  )()
}
