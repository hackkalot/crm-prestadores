import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { AnalyticsFilters } from '@/components/analytics/analytics-filters'
import { AnalyticsContent } from '@/components/analytics/analytics-content'
import { LastSyncBadge } from '@/components/sync/last-sync-badge'
import { ANALYTICS_TABS, KPIS_OPERACIONAIS_TABS } from '@/lib/analytics/constants'
import {
  getCachedOperationalSummary,
  getCachedNetworkHealthData,
  getCachedResponseTimeDistribution,
  getCachedAtRiskProviders,
  getCachedAcceptanceTrend,
  getCachedProviderRanking,
  getCachedVolumeDistribution,
  getCachedRevenueByCategory,
  getCachedTicketTrend,
  getCachedTicketByCategory,
  getCachedPaymentStatusBreakdown,
  getCachedRatingTrend,
  getCachedCompletionByCategory,
  getCachedRatingByCategory,
  getCachedCompletionTrend,
  getCachedLowRatingProviders,
  getCachedConcentrationMetrics,
  getCachedNetworkSaturation,
  getCachedCoverageGaps,
  getCachedAnalyticsFilterOptions,
  getCachedServicesByStatus,
  getCachedNetworkKPIs,
  getCachedReschedulesByProvider,
  getCachedAdditionalVisitsByProvider,
  getCachedClientsSummary,
  getCachedClientRegistrationTrend,
  getCachedClientStatusDistribution,
  getCachedClientRequestDistribution,
  getCachedClientPlatformDistribution,
  getCachedTopClients,
  getCachedClientsByCity,
  getCachedRecurrencesSummary,
  getCachedRecurrenceTrend,
  getCachedRecurrenceStatusDistribution,
  getCachedRecurrencesByService,
  getCachedRecurrenceTypeDistribution,
  getCachedInactivationReasons,
  getCachedRecurrencesByDistrict,
  getCachedTasksSummary,
  getCachedTaskTrend,
  getCachedTaskStatusDistribution,
  getCachedTasksByType,
  getCachedTasksByAssignee,
  getCachedTaskCompletionTime,
  getCachedTasksByProvider,
  getCachedTaskDeadlineCompliance,
} from '@/lib/analytics/cached-actions'
import { getLastSyncInfoBatch, type LastSyncInfo } from '@/lib/sync/logs-actions'
import { requirePageAccess } from '@/lib/permissions/guard'
import type { AnalyticsFilters as AnalyticsFiltersType, RankingMetric } from '@/lib/analytics/types'

// Get the oldest sync date among multiple sync types
function getOldestSyncInfo(syncInfos: Record<string, LastSyncInfo>): LastSyncInfo {
  const infos = Object.values(syncInfos).filter(info => info.lastSuccessfulSync)

  if (infos.length === 0) {
    return { type: 'service_requests', lastSuccessfulSync: null, status: null }
  }

  // Find the oldest sync (earliest date)
  return infos.reduce((oldest, current) => {
    if (!oldest.lastSuccessfulSync) return current
    if (!current.lastSuccessfulSync) return oldest
    return new Date(current.lastSuccessfulSync) < new Date(oldest.lastSuccessfulSync) ? current : oldest
  })
}

// Async component for sync info
async function SyncInfoSection() {
  const syncInfos = await getLastSyncInfoBatch(['service_requests', 'billing', 'allocations'])
  const oldestSync = getOldestSyncInfo(syncInfos)
  return <LastSyncBadge syncInfo={oldestSync} label="Dados" />
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  // Determine context: 'kpis' shows KPIs Operacionais tabs, default shows Analytics tabs
  const context = typeof params.context === 'string' ? params.context : 'analytics'
  const isKpisContext = context === 'kpis'

  // Check permissions based on context
  await requirePageAccess(isKpisContext ? 'kpis_operacionais' : 'analytics')

  const filters: AnalyticsFiltersType = {
    dateFrom: typeof params.dateFrom === 'string' ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === 'string' ? params.dateTo : undefined,
    district: typeof params.district === 'string' ? params.district : undefined,
    category: typeof params.category === 'string' ? params.category : undefined,
    service: typeof params.service === 'string' ? params.service : undefined,
  }

  const defaultTab = typeof params.tab === 'string' ? params.tab : 'overview'
  const rankingMetric = (typeof params.rankingMetric === 'string' ? params.rankingMetric : 'volume') as RankingMetric

  // Fetch ALL data upfront in parallel - enables instant client-side tab switching
  const [
    filterOptions,
    summary,
    servicesByStatus,
    networkHealth,
    responseTime,
    atRiskProviders,
    networkSaturation,
    coverageGaps,
    acceptanceTrend,
    providerRanking,
    volumeDistribution,
    networkKPIs,
    reschedulesByProvider,
    additionalVisitsByProvider,
    completionTrend,
    revenueByCategory,
    ticketTrend,
    ticketByCategory,
    paymentStatus,
    concentration,
    ratingTrend,
    completionByCategory,
    ratingByCategory,
    lowRatingProviders,
    clientsSummary,
    clientRegistrationTrend,
    clientStatusDistribution,
    clientRequestDistribution,
    clientPlatformDistribution,
    topClients,
    clientsByCity,
    recurrencesSummary,
    recurrenceTrend,
    recurrenceStatusDistribution,
    recurrencesByService,
    recurrenceTypeDistribution,
    inactivationReasons,
    recurrencesByDistrict,
    tasksSummary,
    taskTrend,
    taskStatusDistribution,
    tasksByType,
    tasksByAssignee,
    taskCompletionTime,
    tasksByProvider,
    taskDeadlineCompliance,
  ] = await Promise.all([
    getCachedAnalyticsFilterOptions(),
    // Overview + Operational + Network + Financial + Quality data
    getCachedOperationalSummary(filters),
    getCachedServicesByStatus(filters),
    getCachedNetworkHealthData(filters),
    getCachedResponseTimeDistribution(filters),
    getCachedAtRiskProviders(filters),
    getCachedNetworkSaturation(filters),
    getCachedCoverageGaps(filters),
    getCachedAcceptanceTrend(filters),
    getCachedProviderRanking(filters, rankingMetric, 10, 'desc'),
    getCachedVolumeDistribution(filters, 10),
    getCachedNetworkKPIs(filters),
    getCachedReschedulesByProvider(filters, 10),
    getCachedAdditionalVisitsByProvider(filters, 10),
    getCachedCompletionTrend(filters),
    getCachedRevenueByCategory(filters, 8),
    getCachedTicketTrend(filters),
    getCachedTicketByCategory(filters, 8),
    getCachedPaymentStatusBreakdown(filters),
    getCachedConcentrationMetrics(filters),
    getCachedRatingTrend(filters),
    getCachedCompletionByCategory(filters),
    getCachedRatingByCategory(filters),
    getCachedLowRatingProviders(filters),
    // Clients data
    getCachedClientsSummary(filters),
    getCachedClientRegistrationTrend(filters),
    getCachedClientStatusDistribution(filters),
    getCachedClientRequestDistribution(filters),
    getCachedClientPlatformDistribution(filters),
    getCachedTopClients(10, filters),
    getCachedClientsByCity(15, filters),
    // Recurrences data
    getCachedRecurrencesSummary(filters),
    getCachedRecurrenceTrend(filters),
    getCachedRecurrenceStatusDistribution(filters),
    getCachedRecurrencesByService(10, filters),
    getCachedRecurrenceTypeDistribution(filters),
    getCachedInactivationReasons(10, filters),
    getCachedRecurrencesByDistrict(15, filters),
    // Tasks data
    getCachedTasksSummary(filters),
    getCachedTaskTrend(filters),
    getCachedTaskStatusDistribution(filters),
    getCachedTasksByType(10, filters),
    getCachedTasksByAssignee(10, filters),
    getCachedTaskCompletionTime(10, filters),
    getCachedTasksByProvider(15, filters),
    getCachedTaskDeadlineCompliance(filters),
  ])

  // Select tabs based on context
  const tabs = isKpisContext ? KPIS_OPERACIONAIS_TABS : ANALYTICS_TABS
  const pageTitle = isKpisContext ? "KPI's Operacionais" : 'Analytics'
  const pageDescription = isKpisContext
    ? 'Dashboard operacional e metricas da rede'
    : 'Dashboard operacional e metricas da rede'

  return (
    <div className="flex flex-col h-full">
      <Header
        title={pageTitle}
        description={pageDescription}
        syncInfo={
          <Suspense fallback={null}>
            <SyncInfoSection />
          </Suspense>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Filters */}
        <Suspense fallback={<div className="h-12 animate-pulse bg-muted rounded-lg" />}>
          <AnalyticsFilters filterOptions={filterOptions} />
        </Suspense>

        {/* Tabs + Content - Client-side for instant switching */}
        <AnalyticsContent
          defaultTab={defaultTab}
          rankingMetric={rankingMetric}
          tabs={tabs}
          data={{
            summary,
            servicesByStatus,
            networkHealth,
            responseTime,
            atRiskProviders,
            networkSaturation,
            coverageGaps,
            acceptanceTrend,
            providerRanking,
            volumeDistribution,
            networkKPIs,
            reschedulesByProvider,
            additionalVisitsByProvider,
            completionTrend,
            revenueByCategory,
            ticketTrend,
            ticketByCategory,
            paymentStatus,
            concentration,
            ratingTrend,
            completionByCategory,
            ratingByCategory,
            lowRatingProviders,
            clientsSummary,
            clientRegistrationTrend,
            clientStatusDistribution,
            clientRequestDistribution,
            clientPlatformDistribution,
            topClients,
            clientsByCity,
            recurrencesSummary,
            recurrenceTrend,
            recurrenceStatusDistribution,
            recurrencesByService,
            recurrenceTypeDistribution,
            inactivationReasons,
            recurrencesByDistrict,
            tasksSummary,
            taskTrend,
            taskStatusDistribution,
            tasksByType,
            tasksByAssignee,
            taskCompletionTime,
            tasksByProvider,
            taskDeadlineCompliance,
          }}
        />
      </div>
    </div>
  )
}
