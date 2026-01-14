import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskDefinitionsTable } from '@/components/settings/task-definitions-table'
import { GlobalSettings } from '@/components/settings/global-settings'
import { SettingsLogList } from '@/components/settings/settings-log'
import { CoverageSettings } from '@/components/settings/coverage-settings'
import { ServiceMappingReview } from '@/components/service-mapping/service-mapping-review'
import { ServiceMappingStats } from '@/components/service-mapping/service-mapping-stats'
import {
  getTaskDefinitions,
  getSettings,
  getSettingsLog,
  getUsers,
  ensureDefaultSettings,
} from '@/lib/settings/actions'
import { getCoverageSettings } from '@/lib/settings/coverage-actions'
import { getPendingSuggestions, getMappingStats } from '@/lib/service-mapping/actions'
import { Settings, ListTodo, History, Network, MapPin } from 'lucide-react'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const activeTab = (typeof params.tab === 'string' ? params.tab : 'tasks') as string

  // Garantir que as configuracoes padrao existem
  await ensureDefaultSettings()

  const [tasks, settings, logs, users, coverageSettings, mappingSuggestions, mappingStats] =
    await Promise.all([
      getTaskDefinitions(),
      getSettings(),
      getSettingsLog(),
      getUsers(),
      getCoverageSettings(),
      getPendingSuggestions(),
      getMappingStats(),
    ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Configurações"
        description="Definições globais de onboarding, prazos e alertas"
      />
      <div className="flex-1 p-6 overflow-auto">
        <Tabs value={activeTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks" className="gap-2" asChild>
              <a href="/configuracoes?tab=tasks">
                <ListTodo className="h-4 w-4" />
                Tarefas
              </a>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" asChild>
              <a href="/configuracoes?tab=settings">
                <Settings className="h-4 w-4" />
                Alertas
              </a>
            </TabsTrigger>
            <TabsTrigger value="coverage" className="gap-2" asChild>
              <a href="/configuracoes?tab=coverage">
                <MapPin className="h-4 w-4" />
                Cobertura
              </a>
            </TabsTrigger>
            <TabsTrigger value="mapping" className="gap-2" asChild>
              <a href="/configuracoes?tab=mapping">
                <Network className="h-4 w-4" />
                Mapeamento
              </a>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2" asChild>
              <a href="/configuracoes?tab=history">
                <History className="h-4 w-4" />
                Histórico
              </a>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-lg font-medium mb-2">Definições de Tarefas</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Configure os prazos padrão para cada tarefa do processo de onboarding.
                Os prazos são definidos em horas e podem variar entre onboarding Normal e Urgente.
              </p>
            </div>
            <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
              <TaskDefinitionsTable tasks={tasks} users={users} />
            </Suspense>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-lg font-medium mb-2">Parâmetros de Alertas</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Configure os parâmetros globais que afetam o sistema de alertas e notificações.
              </p>
            </div>
            <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded-lg" />}>
              <GlobalSettings settings={settings} users={users} />
            </Suspense>
          </TabsContent>

          <TabsContent value="coverage" className="space-y-4">
            <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded-lg" />}>
              <CoverageSettings
                requestsPerProvider={coverageSettings.coverage_requests_per_provider}
                capacityGoodMin={coverageSettings.coverage_capacity_good_min}
                capacityLowMin={coverageSettings.coverage_capacity_low_min}
                analysisPeriodMonths={coverageSettings.coverage_analysis_period_months}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="mapping" className="space-y-6">
            <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
              <ServiceMappingStats stats={mappingStats} />
              <ServiceMappingReview suggestions={mappingSuggestions.data} />
            </Suspense>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
              <SettingsLogList logs={logs} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
