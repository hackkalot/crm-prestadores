import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { ConfiguracoesTabs } from '@/components/settings/configuracoes-tabs'
import {
  getTaskDefinitions,
  getSettings,
  getSettingsLog,
  getUsers,
  ensureDefaultSettings,
} from '@/lib/settings/actions'
import { getCoverageSettings } from '@/lib/settings/coverage-actions'
import { getPendingSuggestions, getMappingStats } from '@/lib/service-mapping/actions'
import {
  getAngariacaoStats,
  getAngariacaoPrices,
  getAngariacaoMaterials,
  getAngariacaoClusters,
} from '@/lib/angariacao/actions'

export default async function ConfiguracoesPage() {
  // Garantir que as configuracoes padrao existem
  await ensureDefaultSettings()

  const [
    tasks,
    settings,
    logs,
    users,
    coverageSettings,
    mappingSuggestions,
    mappingStats,
    angariacaoStats,
    angariacaoPrices,
    angariacaoMaterials,
    angariacaoClusters,
  ] = await Promise.all([
    getTaskDefinitions(),
    getSettings(),
    getSettingsLog(),
    getUsers(),
    getCoverageSettings(),
    getPendingSuggestions(),
    getMappingStats(),
    getAngariacaoStats(),
    getAngariacaoPrices({ limit: 50 }),
    getAngariacaoMaterials(),
    getAngariacaoClusters(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Configurações"
        description="Definições globais de onboarding, prazos e alertas"
      />
      <div className="flex-1 p-6 overflow-auto">
        <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
          <ConfiguracoesTabs
            tasks={tasks}
            settings={settings}
            logs={logs}
            users={users}
            coverageSettings={coverageSettings}
            mappingSuggestions={mappingSuggestions.data}
            mappingStats={mappingStats}
            angariacaoStats={angariacaoStats}
            angariacaoPrices={angariacaoPrices.data}
            angariacaoMaterials={angariacaoMaterials}
            angariacaoClusters={angariacaoClusters}
          />
        </Suspense>
      </div>
    </div>
  )
}
