import { Header } from '@/components/layout/header'
import { KpiFilters } from '@/components/kpis/kpi-filters'
import { KpiCards } from '@/components/kpis/kpi-cards'
import { StagesChart } from '@/components/kpis/stages-chart'
import { FunnelChart } from '@/components/kpis/funnel-chart'
import { StageTimeChart } from '@/components/kpis/stage-time-chart'
import { OwnerPerformanceTable } from '@/components/kpis/owner-performance-table'
import { PipelineDistributionChart } from '@/components/kpis/pipeline-distribution-chart'
import { OwnerTimeChart } from '@/components/kpis/owner-time-chart'
import { HealthIndicators } from '@/components/kpis/health-indicators'
import { AbandonmentReasonsChart } from '@/components/kpis/abandonment-reasons-chart'
import { TrendsChart } from '@/components/kpis/trends-chart'
import { AbandonmentByStageChart } from '@/components/kpis/abandonment-by-stage-chart'
import {
  getProvidersPerStage,
  getAverageOnboardingTime,
  getOnboardingTotals,
  getCandidaturasPending,
  getConversionFunnel,
  getAverageTimePerStageByType,
  getPerformanceByOwner,
  getDistrictsForKpis,
  getPipelineDistribution,
  getAverageTimeByOwner,
  getHealthIndicators,
  getAbandonmentReasons,
  getAbandonmentByStage,
  getTrends,
  type KpiFilters as KpiFiltersType,
} from '@/lib/kpis/actions'
import { requirePageAccess } from '@/lib/permissions/guard'
import type { Database } from '@/types/database'

type OnboardingType = Database['public']['Enums']['onboarding_type']

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function KpisPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requirePageAccess('kpis')
  const params = await searchParams

  const filters: KpiFiltersType = {
    dateFrom: params.dateFrom as string | undefined,
    dateTo: params.dateTo as string | undefined,
    entityType: params.entityType as string | undefined,
    district: params.district as string | undefined,
    onboardingType: params.onboardingType as OnboardingType | undefined,
  }

  const [
    stages,
    averageTime,
    onboardingTotals,
    candidaturasPending,
    conversionFunnel,
    stageTimeByType,
    ownerPerformance,
    districts,
    pipelineDistribution,
    ownerTime,
    healthIndicators,
    abandonmentReasons,
    abandonmentByStage,
    trends,
  ] = await Promise.all([
    getProvidersPerStage(filters),
    getAverageOnboardingTime(filters),
    getOnboardingTotals(filters),
    getCandidaturasPending(filters),
    getConversionFunnel(filters),
    getAverageTimePerStageByType(filters),
    getPerformanceByOwner(filters),
    getDistrictsForKpis(),
    getPipelineDistribution(filters),
    getAverageTimeByOwner(filters),
    getHealthIndicators(filters),
    getAbandonmentReasons(filters),
    getAbandonmentByStage(filters),
    getTrends(filters),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="KPIs"
        description="Métricas e indicadores de desempenho"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Filtros */}
        <KpiFilters districts={districts} />

        {/* Cards de Resumo */}
        <KpiCards
          onboardingTotals={onboardingTotals}
          candidaturasPending={candidaturasPending}
          averageTime={averageTime}
          conversionFunnel={conversionFunnel}
        />

        {/* Saúde e Tendências */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <HealthIndicators data={healthIndicators} />
          <div className="lg:col-span-2">
            <TrendsChart aggregationType={trends.aggregationType} data={trends.data} />
          </div>
        </div>

        {/* Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PipelineDistributionChart
            candidaturas={pipelineDistribution.candidaturas}
            onboarding={pipelineDistribution.onboarding}
          />
          <div className="lg:col-span-2">
            <StagesChart stages={stages} />
          </div>
        </div>

        {/* Conversão */}
        <FunnelChart data={conversionFunnel} />

        {/* Tempos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StageTimeChart data={stageTimeByType} />
          <OwnerTimeChart data={ownerTime} />
        </div>

        {/* Abandonos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AbandonmentByStageChart data={abandonmentByStage} />
          <AbandonmentReasonsChart data={abandonmentReasons} />
        </div>

        {/* Performance da Equipa */}
        <OwnerPerformanceTable data={ownerPerformance} />
      </div>
    </div>
  )
}
