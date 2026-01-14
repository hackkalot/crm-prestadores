'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskDefinitionsTable } from '@/components/settings/task-definitions-table'
import { GlobalSettings } from '@/components/settings/global-settings'
import { SettingsLogList } from '@/components/settings/settings-log'
import { CoverageSettings } from '@/components/settings/coverage-settings'
import { ServiceMappingReview } from '@/components/service-mapping/service-mapping-review'
import { ServiceMappingStats } from '@/components/service-mapping/service-mapping-stats'
import { Settings, ListTodo, History, Network, MapPin } from 'lucide-react'

interface ConfiguracoesTabsProps {
  tasks: any[]
  settings: any
  logs: any[]
  users: any[]
  coverageSettings: {
    coverage_requests_per_provider: number
    coverage_capacity_good_min: number
    coverage_capacity_low_min: number
    coverage_analysis_period_months: number
  }
  mappingSuggestions: any[]
  mappingStats: any
}

export function ConfiguracoesTabs({
  tasks,
  settings,
  logs,
  users,
  coverageSettings,
  mappingSuggestions,
  mappingStats,
}: ConfiguracoesTabsProps) {
  const [activeTab, setActiveTab] = useState('tasks')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="tasks" className="gap-2">
          <ListTodo className="h-4 w-4" />
          Tarefas
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          Alertas
        </TabsTrigger>
        <TabsTrigger value="coverage" className="gap-2">
          <MapPin className="h-4 w-4" />
          Cobertura
        </TabsTrigger>
        <TabsTrigger value="mapping" className="gap-2">
          <Network className="h-4 w-4" />
          Mapeamento
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-2">
          <History className="h-4 w-4" />
          Histórico
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
        <TaskDefinitionsTable tasks={tasks} users={users} />
      </TabsContent>

      <TabsContent value="settings" className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-medium mb-2">Parâmetros de Alertas</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Configure os parâmetros globais que afetam o sistema de alertas e notificações.
          </p>
        </div>
        <GlobalSettings settings={settings} users={users} />
      </TabsContent>

      <TabsContent value="coverage" className="space-y-4">
        <CoverageSettings
          requestsPerProvider={coverageSettings.coverage_requests_per_provider}
          capacityGoodMin={coverageSettings.coverage_capacity_good_min}
          capacityLowMin={coverageSettings.coverage_capacity_low_min}
          analysisPeriodMonths={coverageSettings.coverage_analysis_period_months}
        />
      </TabsContent>

      <TabsContent value="mapping" className="space-y-6">
        <ServiceMappingStats stats={mappingStats} />
        <ServiceMappingReview suggestions={mappingSuggestions} />
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <SettingsLogList logs={logs} />
      </TabsContent>
    </Tabs>
  )
}
