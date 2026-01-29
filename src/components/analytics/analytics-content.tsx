'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsSummaryCards } from '@/components/analytics/analytics-summary-cards'
import { SlaHealthIndicators } from '@/components/analytics/operational/sla-health-indicators'
import { ResponseTimeDistributionChart } from '@/components/analytics/operational/response-time-distribution'
import { AtRiskProvidersTable } from '@/components/analytics/operational/at-risk-providers-table'
import { NetworkSaturationCard } from '@/components/analytics/operational/network-saturation-card'
import { CoverageGapsTable } from '@/components/analytics/operational/coverage-gaps-table'
import { CriticalIssuesSummary } from '@/components/analytics/operational/critical-issues-summary'
import { AcceptanceTrendChart } from '@/components/analytics/network/acceptance-trend-chart'
import { UnifiedRankingCard } from '@/components/analytics/network/unified-ranking-card'
import { VolumeDistributionChart } from '@/components/analytics/network/volume-distribution-chart'
import { NetworkSummaryCards } from '@/components/analytics/network/network-summary-cards'
import { ReschedulesByProviderChart } from '@/components/analytics/network/reschedules-by-provider-chart'
import { AdditionalVisitsByProviderChart } from '@/components/analytics/network/additional-visits-by-provider-chart'
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
import { ServicesByStatusChart } from '@/components/analytics/overview/services-by-status-chart'
import { ClientsSummaryCards } from '@/components/analytics/clients/clients-summary-cards'
import { ClientRegistrationTrendChart } from '@/components/analytics/clients/client-registration-trend-chart'
import { ClientStatusChart } from '@/components/analytics/clients/client-status-chart'
import { ClientRequestDistributionChart } from '@/components/analytics/clients/client-request-distribution-chart'
import { ClientPlatformChart } from '@/components/analytics/clients/client-platform-chart'
import { TopClientsTable } from '@/components/analytics/clients/top-clients-table'
import { ClientsByCityChart } from '@/components/analytics/clients/clients-by-city-chart'
import { RecurrencesSummaryCards } from '@/components/analytics/recurrences/recurrences-summary-cards'
import { RecurrenceTrendChart } from '@/components/analytics/recurrences/recurrence-trend-chart'
import { RecurrenceStatusChart } from '@/components/analytics/recurrences/recurrence-status-chart'
import { RecurrencesByServiceChart } from '@/components/analytics/recurrences/recurrences-by-service-chart'
import { RecurrenceTypeChart } from '@/components/analytics/recurrences/recurrence-type-chart'
import { InactivationReasonsChart } from '@/components/analytics/recurrences/inactivation-reasons-chart'
import { RecurrencesByDistrictChart } from '@/components/analytics/recurrences/recurrences-by-district-chart'
import { TasksSummaryCards } from '@/components/analytics/tasks/tasks-summary-cards'
import { TaskTrendChart } from '@/components/analytics/tasks/task-trend-chart'
import { TaskStatusChart } from '@/components/analytics/tasks/task-status-chart'
import { TasksByTypeChart } from '@/components/analytics/tasks/tasks-by-type-chart'
import { TasksByAssigneeChart } from '@/components/analytics/tasks/tasks-by-assignee-chart'
import { TaskCompletionTimeChart } from '@/components/analytics/tasks/task-completion-time-chart'
import { TasksByProviderChart } from '@/components/analytics/tasks/tasks-by-provider-chart'
import { TaskDeadlineChart } from '@/components/analytics/tasks/task-deadline-chart'
import { ANALYTICS_TABS } from '@/lib/analytics/constants'
import type { RankingMetric } from '@/lib/analytics/types'

// Types for all the data props
interface AnalyticsContentProps {
  defaultTab: string
  rankingMetric: RankingMetric
  tabs?: readonly { value: string; label: string }[]
  data: {
    summary: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getOperationalSummary>> | null
    servicesByStatus: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getServicesByStatus>> | null
    networkHealth: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getNetworkHealthData>> | null
    responseTime: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getResponseTimeDistribution>> | null
    atRiskProviders: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getAtRiskProviders>> | null
    networkSaturation: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getNetworkSaturation>> | null
    coverageGaps: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getCoverageGaps>> | null
    acceptanceTrend: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getAcceptanceTrend>> | null
    providerRanking: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getProviderRanking>> | null
    volumeDistribution: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getVolumeDistribution>> | null
    networkKPIs: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getNetworkKPIs>> | null
    reschedulesByProvider: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getReschedulesByProvider>> | null
    additionalVisitsByProvider: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getAdditionalVisitsByProvider>> | null
    completionTrend: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getCompletionTrend>> | null
    revenueByCategory: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getRevenueByCategory>> | null
    ticketTrend: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getTicketTrend>> | null
    ticketByCategory: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getTicketByCategory>> | null
    paymentStatus: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getPaymentStatusBreakdown>> | null
    concentration: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getConcentrationMetrics>> | null
    ratingTrend: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getRatingTrend>> | null
    completionByCategory: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getCompletionByCategory>> | null
    ratingByCategory: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getRatingByCategory>> | null
    lowRatingProviders: Awaited<ReturnType<typeof import('@/lib/analytics/actions').getLowRatingProviders>> | null
    clientsSummary: Awaited<ReturnType<typeof import('@/lib/analytics/clients-actions').getClientsSummary>> | null
    clientRegistrationTrend: Awaited<ReturnType<typeof import('@/lib/analytics/clients-actions').getClientRegistrationTrend>> | null
    clientStatusDistribution: Awaited<ReturnType<typeof import('@/lib/analytics/clients-actions').getClientStatusDistribution>> | null
    clientRequestDistribution: Awaited<ReturnType<typeof import('@/lib/analytics/clients-actions').getClientRequestDistribution>> | null
    clientPlatformDistribution: Awaited<ReturnType<typeof import('@/lib/analytics/clients-actions').getClientPlatformDistribution>> | null
    topClients: Awaited<ReturnType<typeof import('@/lib/analytics/clients-actions').getTopClients>> | null
    clientsByCity: Awaited<ReturnType<typeof import('@/lib/analytics/clients-actions').getClientsByCity>> | null
    recurrencesSummary: Awaited<ReturnType<typeof import('@/lib/analytics/recurrences-actions').getRecurrencesSummary>> | null
    recurrenceTrend: Awaited<ReturnType<typeof import('@/lib/analytics/recurrences-actions').getRecurrenceTrend>> | null
    recurrenceStatusDistribution: Awaited<ReturnType<typeof import('@/lib/analytics/recurrences-actions').getRecurrenceStatusDistribution>> | null
    recurrencesByService: Awaited<ReturnType<typeof import('@/lib/analytics/recurrences-actions').getRecurrencesByService>> | null
    recurrenceTypeDistribution: Awaited<ReturnType<typeof import('@/lib/analytics/recurrences-actions').getRecurrenceTypeDistribution>> | null
    inactivationReasons: Awaited<ReturnType<typeof import('@/lib/analytics/recurrences-actions').getInactivationReasons>> | null
    recurrencesByDistrict: Awaited<ReturnType<typeof import('@/lib/analytics/recurrences-actions').getRecurrencesByDistrict>> | null
    tasksSummary: Awaited<ReturnType<typeof import('@/lib/analytics/tasks-actions').getTasksSummary>> | null
    taskTrend: Awaited<ReturnType<typeof import('@/lib/analytics/tasks-actions').getTaskTrend>> | null
    taskStatusDistribution: Awaited<ReturnType<typeof import('@/lib/analytics/tasks-actions').getTaskStatusDistribution>> | null
    tasksByType: Awaited<ReturnType<typeof import('@/lib/analytics/tasks-actions').getTasksByType>> | null
    tasksByAssignee: Awaited<ReturnType<typeof import('@/lib/analytics/tasks-actions').getTasksByAssignee>> | null
    taskCompletionTime: Awaited<ReturnType<typeof import('@/lib/analytics/tasks-actions').getTaskCompletionTime>> | null
    tasksByProvider: Awaited<ReturnType<typeof import('@/lib/analytics/tasks-actions').getTasksByProvider>> | null
    taskDeadlineCompliance: Awaited<ReturnType<typeof import('@/lib/analytics/tasks-actions').getTaskDeadlineCompliance>> | null
  }
}

export function AnalyticsContent({ defaultTab, rankingMetric, tabs = ANALYTICS_TABS, data }: AnalyticsContentProps) {
  const [currentTab, setCurrentTab] = useState(defaultTab)

  // Reset to overview when context changes (tabs array changes)
  useEffect(() => {
    setCurrentTab('overview')
  }, [tabs])

  const {
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
  } = data

  return (
    <>
      {/* Tabs - Client-side state management for instant switching */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="w-fit">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Tab Content */}
      {currentTab === 'overview' && summary && (
        <div className="space-y-8">
          {/* Summary Cards */}
          <AnalyticsSummaryCards data={summary} />

          {/* Gráficos Overview: Serviços por Estado + Ticket Médio */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Visão Geral de Pedidos
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {servicesByStatus && <ServicesByStatusChart data={servicesByStatus} />}
              {ticketTrend && <TicketTrendChart data={ticketTrend} />}
            </div>
          </section>

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
          {/* KPI Cards */}
          {networkKPIs && <NetworkSummaryCards data={networkKPIs} />}

          {/* Saúde da Rede + Issues */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {networkHealth && <SlaHealthIndicators data={networkHealth} />}
            <CriticalIssuesSummary
              atRiskProviders={atRiskProviders || undefined}
              coverageGaps={coverageGaps || undefined}
              lowRatingProviders={lowRatingProviders || undefined}
              networkSaturation={networkSaturation || undefined}
            />
          </div>

          {/* Aceites vs Rejeitados + Serviços Concluídos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {acceptanceTrend && <AcceptanceTrendChart data={acceptanceTrend} />}
            {completionTrend && <CompletionTrendChart data={completionTrend} />}
          </div>

          {/* Reagendamentos + Visitas Adicionais por prestador */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reschedulesByProvider && <ReschedulesByProviderChart data={reschedulesByProvider} />}
            {additionalVisitsByProvider && <AdditionalVisitsByProviderChart data={additionalVisitsByProvider} />}
          </div>

          {/* Volume Distribution + Concentration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {volumeDistribution && <VolumeDistributionChart data={volumeDistribution} />}
            {concentration && <ConcentrationCard data={concentration} />}
          </div>

          {/* Ranking de Prestadores */}
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

      {currentTab === 'clients' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          {clientsSummary && <ClientsSummaryCards data={clientsSummary} />}

          {/* Evolução de Registos (full width) */}
          {clientRegistrationTrend && <ClientRegistrationTrendChart data={clientRegistrationTrend} />}

          {/* Status + Plataforma */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {clientStatusDistribution && <ClientStatusChart data={clientStatusDistribution} />}
            {clientPlatformDistribution && <ClientPlatformChart data={clientPlatformDistribution} />}
          </div>

          {/* Distribuição de Pedidos + Clientes por Cidade */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {clientRequestDistribution && <ClientRequestDistributionChart data={clientRequestDistribution} />}
            {clientsByCity && <ClientsByCityChart data={clientsByCity} />}
          </div>

          {/* Top Clientes (full width) */}
          {topClients && <TopClientsTable data={topClients} />}
        </div>
      )}

      {currentTab === 'recurrences' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          {recurrencesSummary && <RecurrencesSummaryCards data={recurrencesSummary} />}

          {/* Evolução de Recorrências (full width) */}
          {recurrenceTrend && <RecurrenceTrendChart data={recurrenceTrend} />}

          {/* Status + Tipo de Recorrência */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recurrenceStatusDistribution && <RecurrenceStatusChart data={recurrenceStatusDistribution} />}
            {recurrenceTypeDistribution && <RecurrenceTypeChart data={recurrenceTypeDistribution} />}
          </div>

          {/* Serviços + Motivos de Inativação */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recurrencesByService && <RecurrencesByServiceChart data={recurrencesByService} />}
            {inactivationReasons && <InactivationReasonsChart data={inactivationReasons} />}
          </div>

          {/* Concelhos (full width) */}
          {recurrencesByDistrict && <RecurrencesByDistrictChart data={recurrencesByDistrict} />}
        </div>
      )}

      {currentTab === 'tasks' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          {tasksSummary && <TasksSummaryCards data={tasksSummary} />}

          {/* Evolução de Tarefas (full width) */}
          {taskTrend && <TaskTrendChart data={taskTrend} />}

          {/* Status + Tipo de Tarefa */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {taskStatusDistribution && <TaskStatusChart data={taskStatusDistribution} />}
            {tasksByType && <TasksByTypeChart data={tasksByType} />}
          </div>

          {/* Colaboradores + Cumprimento de Prazos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tasksByAssignee && <TasksByAssigneeChart data={tasksByAssignee} />}
            {taskDeadlineCompliance && <TaskDeadlineChart data={taskDeadlineCompliance} />}
          </div>

          {/* Tempo de Conclusão + Tarefas por Prestador */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {taskCompletionTime && <TaskCompletionTimeChart data={taskCompletionTime} />}
            {tasksByProvider && <TasksByProviderChart data={tasksByProvider} />}
          </div>
        </div>
      )}
    </>
  )
}
