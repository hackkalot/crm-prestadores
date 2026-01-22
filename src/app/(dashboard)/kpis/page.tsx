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
import { CadenceChart } from '@/components/kpis/cadence-chart'
import { ContactsTrendChart } from '@/components/kpis/contacts-trend-chart'
import { WorkedProvidersChart } from '@/components/kpis/worked-providers-chart'
import {
  getProvidersPerStage,
  getOnboardingTotals,
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
  getContactsMade,
  getProvidersWorked,
  getAverageTimeToNetwork,
  getWeeklyCadence,
  getContactsTrend,
  getWorkedProvidersTrend,
  getRelationshipManagers,
  getTasksCompleted,
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
    userId: params.userId as string | undefined,
  }

  const [
    stages,
    onboardingTotals,
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
    contactsMade,
    providersWorked,
    avgTimeToNetwork,
    weeklyCadence,
    contactsTrend,
    workedProvidersTrend,
    users,
    tasksCompleted,
  ] = await Promise.all([
    getProvidersPerStage(filters),
    getOnboardingTotals(filters),
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
    getContactsMade(filters),
    getProvidersWorked(filters),
    getAverageTimeToNetwork(filters),
    getWeeklyCadence(filters),
    getContactsTrend(filters),
    getWorkedProvidersTrend(filters),
    getRelationshipManagers(),
    getTasksCompleted(filters),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="KPIs"
        description="Métricas e indicadores de desempenho"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* 1. Filtros */}
        <KpiFilters districts={districts} users={users} />

        {/* 2. KPI Cards (5 em linha) */}
        <KpiCards
          onboardingTotals={onboardingTotals}
          tasksCompleted={tasksCompleted}
          contactsMade={contactsMade}
          providersWorked={providersWorked}
          avgTimeToNetwork={avgTimeToNetwork}
        />

        {/* 3. Funil + Etapas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FunnelChart data={conversionFunnel} />
          <StagesChart stages={stages} />
        </div>

        {/* 4. Saúde + Cadência */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <HealthIndicators data={healthIndicators} />
          <div className="lg:col-span-2">
            <CadenceChart data={weeklyCadence} />
          </div>
        </div>

        {/* 5. Contactos + Trabalhados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContactsTrendChart data={contactsTrend} />
          <WorkedProvidersChart data={workedProvidersTrend} />
        </div>

        {/* 6. Pipeline Distribution + Tendências */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PipelineDistributionChart
            candidaturas={pipelineDistribution.candidaturas}
            onboarding={pipelineDistribution.onboarding}
          />
          <div className="lg:col-span-2">
            <TrendsChart aggregationType={trends.aggregationType} data={trends.data} />
          </div>
        </div>

        {/* 7. Tempos por etapa e por owner */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StageTimeChart data={stageTimeByType} />
          <OwnerTimeChart data={ownerTime} />
        </div>

        {/* 8. Abandonos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AbandonmentByStageChart data={abandonmentByStage} />
          <AbandonmentReasonsChart data={abandonmentReasons} />
        </div>

        {/* 9. Performance da Equipa (Gamification) */}
        <OwnerPerformanceTable data={ownerPerformance} />
      </div>
    </div>
  )
}
