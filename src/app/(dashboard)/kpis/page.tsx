import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { KpiFilters } from '@/components/kpis/kpi-filters'
import { KpiCards, TimeComparisonCard } from '@/components/kpis/kpi-cards'
import { StagesChart } from '@/components/kpis/stages-chart'
import { FunnelChart } from '@/components/kpis/funnel-chart'
import { StageTimeChart } from '@/components/kpis/stage-time-chart'
import { OwnerPerformanceTable } from '@/components/kpis/owner-performance-table'
import {
  getProvidersPerStage,
  getAverageOnboardingTime,
  getOnboardingTotals,
  getCandidaturasPending,
  getConversionFunnel,
  getAverageTimePerStage,
  getPerformanceByOwner,
  getDistrictsForKpis,
  type KpiFilters as KpiFiltersType,
} from '@/lib/kpis/actions'
import type { OnboardingType } from '@/types/database'

interface KpisPageProps {
  searchParams: Promise<{
    dateFrom?: string
    dateTo?: string
    entityType?: string
    district?: string
    onboardingType?: string
  }>
}

export default async function KpisPage({ searchParams }: KpisPageProps) {
  const params = await searchParams

  const filters: KpiFiltersType = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    entityType: params.entityType,
    district: params.district,
    onboardingType: params.onboardingType as OnboardingType | undefined,
  }

  const [
    stages,
    averageTime,
    onboardingTotals,
    candidaturasPending,
    conversionFunnel,
    stageTime,
    ownerPerformance,
    districts,
  ] = await Promise.all([
    getProvidersPerStage(filters),
    getAverageOnboardingTime(filters),
    getOnboardingTotals(filters),
    getCandidaturasPending(filters),
    getConversionFunnel(filters),
    getAverageTimePerStage(filters),
    getPerformanceByOwner(filters),
    getDistrictsForKpis(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="KPIs"
        description="Metricas e indicadores de onboarding"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Filters */}
        <Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded-lg" />}>
          <KpiFilters districts={districts} />
        </Suspense>

        {/* Main KPI Cards */}
        <KpiCards
          onboardingTotals={onboardingTotals}
          candidaturasPending={candidaturasPending}
          averageTime={averageTime}
          conversionFunnel={conversionFunnel}
        />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stages Chart */}
          <StagesChart stages={stages} />

          {/* Funnel Chart */}
          <FunnelChart data={conversionFunnel} />
        </div>

        {/* Stage Time Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time per Stage */}
          <StageTimeChart data={stageTime} />

          {/* Time Comparison */}
          <TimeComparisonCard averageTime={averageTime} />
        </div>

        {/* Owner Performance */}
        <OwnerPerformanceTable data={ownerPerformance} />
      </div>
    </div>
  )
}
