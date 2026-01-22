import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { AnalyticsSummaryCards } from '@/components/analytics/analytics-summary-cards'
import { AnalyticsFilters } from '@/components/analytics/analytics-filters'
import { AnalyticsTabs } from '@/components/analytics/analytics-tabs'
import { SlaHealthIndicators } from '@/components/analytics/operational/sla-health-indicators'
import { ResponseTimeDistributionChart } from '@/components/analytics/operational/response-time-distribution'
import { AtRiskProvidersTable } from '@/components/analytics/operational/at-risk-providers-table'
import { NetworkSaturationCard } from '@/components/analytics/operational/network-saturation-card'
import { CoverageGapsTable } from '@/components/analytics/operational/coverage-gaps-table'
import { CriticalIssuesSummary } from '@/components/analytics/operational/critical-issues-summary'
import { AcceptanceTrendChart } from '@/components/analytics/network/acceptance-trend-chart'
import { UnifiedRankingCard } from '@/components/analytics/network/unified-ranking-card'
import { VolumeDistributionChart } from '@/components/analytics/network/volume-distribution-chart'
import { RevenueByCategoryChart } from '@/components/analytics/financial/revenue-by-category-chart'
import { TicketTrendChart } from '@/components/analytics/financial/ticket-trend-chart'
import { TicketByCategoryChart } from '@/components/analytics/financial/ticket-by-category-chart'
import { PaymentStatusChart } from '@/components/analytics/financial/payment-status-chart'
import { ConcentrationCard } from '@/components/analytics/financial/concentration-card'
import { RatingTrendChart } from '@/components/analytics/quality/rating-trend-chart'
import { CompletionByCategoryChart } from '@/components/analytics/quality/completion-by-category-chart'
import { RatingByCategoryChart } from '@/components/analytics/quality/rating-by-category-chart'
import { CompletionTrendChart } from '@/components/analytics/quality/completion-trend-chart'
import { LowRatingAlerts } from '@/components/analytics/quality/low-rating-alerts'
import { LastSyncBadge } from '@/components/sync/last-sync-badge'
import {
  getOperationalSummary,
  getNetworkHealthData,
  getResponseTimeDistribution,
  getAtRiskProviders,
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
  getAnalyticsFilterOptions,
} from '@/lib/analytics/actions'
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
  await requirePageAccess('analytics')
  const params = await searchParams

  const filters: AnalyticsFiltersType = {
    dateFrom: typeof params.dateFrom === 'string' ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === 'string' ? params.dateTo : undefined,
    district: typeof params.district === 'string' ? params.district : undefined,
    category: typeof params.category === 'string' ? params.category : undefined,
    service: typeof params.service === 'string' ? params.service : undefined,
  }

  const currentTab = typeof params.tab === 'string' ? params.tab : 'overview'
  const rankingMetric = (typeof params.rankingMetric === 'string' ? params.rankingMetric : 'volume') as RankingMetric

  // Fetch data based on current tab to optimize loading
  const fetchOverviewData = currentTab === 'overview'
  const fetchOperationalData = currentTab === 'overview' || currentTab === 'operational'
  const fetchNetworkData = currentTab === 'overview' || currentTab === 'network'
  const fetchFinancialData = currentTab === 'overview' || currentTab === 'financial'
  const fetchQualityData = currentTab === 'overview' || currentTab === 'quality'

  // Fetch all needed data in parallel
  const [
    filterOptions,
    summary,
    networkHealth,
    responseTime,
    atRiskProviders,
    networkSaturation,
    coverageGaps,
    acceptanceTrend,
    providerRanking,
    volumeDistribution,
    revenueByCategory,
    ticketTrend,
    ticketByCategory,
    paymentStatus,
    concentration,
    ratingTrend,
    completionByCategory,
    ratingByCategory,
    completionTrend,
    lowRatingProviders,
  ] = await Promise.all([
    getAnalyticsFilterOptions(),
    fetchOverviewData ? getOperationalSummary(filters) : Promise.resolve(null),
    fetchOperationalData ? getNetworkHealthData(filters) : Promise.resolve(null),
    fetchOperationalData ? getResponseTimeDistribution(filters) : Promise.resolve(null),
    fetchOperationalData ? getAtRiskProviders(filters) : Promise.resolve(null),
    fetchOperationalData ? getNetworkSaturation(filters) : Promise.resolve(null),
    fetchOperationalData ? getCoverageGaps(filters) : Promise.resolve(null),
    fetchNetworkData ? getAcceptanceTrend(filters) : Promise.resolve(null),
    fetchNetworkData ? getProviderRanking(filters, rankingMetric, 10, 'desc') : Promise.resolve(null),
    fetchNetworkData ? getVolumeDistribution(filters, 10) : Promise.resolve(null),
    fetchFinancialData ? getRevenueByCategory(filters, 8) : Promise.resolve(null),
    fetchFinancialData ? getTicketTrend(filters) : Promise.resolve(null),
    fetchFinancialData ? getTicketByCategory(filters, 8) : Promise.resolve(null),
    fetchFinancialData ? getPaymentStatusBreakdown(filters) : Promise.resolve(null),
    fetchFinancialData ? getConcentrationMetrics(filters) : Promise.resolve(null),
    fetchQualityData ? getRatingTrend(filters) : Promise.resolve(null),
    fetchQualityData ? getCompletionByCategory(filters) : Promise.resolve(null),
    fetchQualityData ? getRatingByCategory(filters) : Promise.resolve(null),
    fetchQualityData ? getCompletionTrend(filters) : Promise.resolve(null),
    fetchQualityData ? getLowRatingProviders(filters) : Promise.resolve(null),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Analytics"
        description="Dashboard operacional e metricas da rede"
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

        {/* Tabs */}
        <Suspense fallback={<div className="h-10 animate-pulse bg-muted rounded-lg" />}>
          <AnalyticsTabs defaultValue={currentTab} />
        </Suspense>

        {/* Tab Content */}
        {currentTab === 'overview' && summary && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <AnalyticsSummaryCards data={summary} />

            {/* Secção 1: Saúde Operacional */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Saúde Operacional
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {networkHealth && <SlaHealthIndicators data={networkHealth} />}
                <CriticalIssuesSummary
                  atRiskProviders={atRiskProviders || undefined}
                  coverageGaps={coverageGaps || undefined}
                  lowRatingProviders={lowRatingProviders || undefined}
                  networkSaturation={networkSaturation || undefined}
                />
              </div>
            </section>

            {/* Secção 2: Performance da Rede */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Performance da Rede
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {acceptanceTrend && <AcceptanceTrendChart data={acceptanceTrend} />}
                {completionTrend && <CompletionTrendChart data={completionTrend} />}
              </div>
            </section>

            {/* Secção 3: Visão Financeira */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Visão Financeira
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {revenueByCategory && <RevenueByCategoryChart data={revenueByCategory} />}
                {concentration && <ConcentrationCard data={concentration} />}
              </div>
            </section>

            {/* Secção 4: Qualidade */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                Qualidade de Serviço
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {ratingTrend && <RatingTrendChart data={ratingTrend} />}
                {ratingByCategory && <RatingByCategoryChart data={ratingByCategory} />}
              </div>
            </section>

            {/* Alertas Críticos */}
            {((atRiskProviders && atRiskProviders.length > 0) || (lowRatingProviders && lowRatingProviders.length > 0)) && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Alertas
                </h2>
                <div className="space-y-6">
                  {atRiskProviders && atRiskProviders.length > 0 && (
                    <AtRiskProvidersTable data={atRiskProviders.slice(0, 5)} />
                  )}
                  {lowRatingProviders && lowRatingProviders.length > 0 && (
                    <LowRatingAlerts data={lowRatingProviders.slice(0, 5)} />
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {currentTab === 'operational' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {networkHealth && <SlaHealthIndicators data={networkHealth} />}
              {responseTime && <ResponseTimeDistributionChart data={responseTime} />}
            </div>

            {/* Network Saturation Analysis */}
            {networkSaturation && <NetworkSaturationCard data={networkSaturation} />}

            {/* At Risk Providers */}
            {atRiskProviders && <AtRiskProvidersTable data={atRiskProviders} />}

            {/* Coverage Gaps */}
            {coverageGaps && <CoverageGapsTable data={coverageGaps} />}
          </div>
        )}

        {currentTab === 'network' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {acceptanceTrend && <AcceptanceTrendChart data={acceptanceTrend} />}
              {volumeDistribution && <VolumeDistributionChart data={volumeDistribution} />}
            </div>
            {providerRanking && (
              <UnifiedRankingCard data={providerRanking} currentMetric={rankingMetric} />
            )}
          </div>
        )}

        {currentTab === 'financial' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {revenueByCategory && <RevenueByCategoryChart data={revenueByCategory} />}
              {ticketTrend && <TicketTrendChart data={ticketTrend} />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {ticketByCategory && <TicketByCategoryChart data={ticketByCategory} />}
              {concentration && <ConcentrationCard data={concentration} />}
            </div>

            {paymentStatus && <PaymentStatusChart data={paymentStatus} />}
          </div>
        )}

        {currentTab === 'quality' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {ratingTrend && <RatingTrendChart data={ratingTrend} />}
              {ratingByCategory && <RatingByCategoryChart data={ratingByCategory} />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {completionTrend && <CompletionTrendChart data={completionTrend} />}
              {completionByCategory && <CompletionByCategoryChart data={completionByCategory} />}
            </div>

            {/* Low Rating Alerts */}
            {lowRatingProviders && <LowRatingAlerts data={lowRatingProviders} />}
          </div>
        )}
      </div>
    </div>
  )
}
