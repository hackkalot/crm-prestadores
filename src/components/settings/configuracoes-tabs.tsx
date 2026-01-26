'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskDefinitionsTable } from '@/components/settings/task-definitions-table'
import { GlobalSettings } from '@/components/settings/global-settings'
import { SettingsLogList } from '@/components/settings/settings-log'
import { CoverageSettings } from '@/components/settings/coverage-settings'
import { ServiceMappingReview } from '@/components/service-mapping/service-mapping-review'
import { ServiceMappingStats } from '@/components/service-mapping/service-mapping-stats'
import { CatalogStatsCards } from '@/components/service-catalog/catalog-stats'
import { CatalogPricesTable } from '@/components/service-catalog/prices-table'
import { CatalogMaterialsTable } from '@/components/service-catalog/materials-table'
import { EmailTemplatesSettings } from '@/components/settings/email-templates-settings'
import { Settings, ListTodo, History, Network, MapPin, Euro, Mail } from 'lucide-react'
import type { CatalogPrice, CatalogMaterial, CatalogStats } from '@/lib/service-catalog/actions'
import type { TaskDefinitionWithStage, Setting, SettingsLog } from '@/lib/settings/actions'
import type { CoverageSettings as CoverageSettingsType } from '@/lib/settings/coverage-actions'
import type { EmailTemplateWithCreator } from '@/lib/email-templates/actions'

interface ConfiguracoesTabsProps {
  tasks: TaskDefinitionWithStage[]
  settings: Setting[]
  logs: SettingsLog[]
  users: Array<{ id: string; name: string; email: string }>
  coverageSettings: CoverageSettingsType
  mappingSuggestions: unknown[]
  mappingStats: unknown
  catalogStats: CatalogStats
  catalogPrices: CatalogPrice[]
  catalogMaterials: CatalogMaterial[]
  catalogClusters: string[]
  catalogMaterialCategories: string[]
  emailTemplates: EmailTemplateWithCreator[]
}

export function ConfiguracoesTabs({
  tasks,
  settings,
  logs,
  users,
  coverageSettings,
  mappingSuggestions,
  mappingStats,
  catalogStats,
  catalogPrices,
  catalogMaterials,
  catalogClusters,
  catalogMaterialCategories,
  emailTemplates,
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
        <TabsTrigger value="catalog" className="gap-2">
          <Euro className="h-4 w-4" />
          Catálogo Serviços
        </TabsTrigger>
        <TabsTrigger value="emails" className="gap-2">
          <Mail className="h-4 w-4" />
          Emails
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
        <TaskDefinitionsTable tasks={tasks} users={users} emailTemplates={emailTemplates} />
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
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ServiceMappingStats stats={mappingStats as any} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ServiceMappingReview suggestions={mappingSuggestions as any} />
      </TabsContent>

      <TabsContent value="catalog" className="space-y-4">
        <CatalogStatsCards stats={catalogStats} />
        <CatalogPricesTable
          prices={catalogPrices}
          clusters={catalogClusters}
        />
        <CatalogMaterialsTable materials={catalogMaterials} categories={catalogMaterialCategories} />
      </TabsContent>

      <TabsContent value="emails" className="space-y-4">
        <EmailTemplatesSettings templates={emailTemplates} />
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <SettingsLogList logs={logs} />
      </TabsContent>
    </Tabs>
  )
}
