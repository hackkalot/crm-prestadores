import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskDefinitionsTable } from '@/components/settings/task-definitions-table'
import { GlobalSettings } from '@/components/settings/global-settings'
import { SettingsLogList } from '@/components/settings/settings-log'
import {
  getTaskDefinitions,
  getSettings,
  getSettingsLog,
  getUsers,
  ensureDefaultSettings,
} from '@/lib/settings/actions'
import { Settings, ListTodo, History } from 'lucide-react'

export default async function ConfiguracoesPage() {
  // Garantir que as configuracoes padrao existem
  await ensureDefaultSettings()

  const [tasks, settings, logs, users] = await Promise.all([
    getTaskDefinitions(),
    getSettings(),
    getSettingsLog(),
    getUsers(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Configuracoes"
        description="Definicoes globais de onboarding, prazos e alertas"
      />
      <div className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Tarefas
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Historico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-lg font-medium mb-2">Definicoes de Tarefas</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Configure os prazos padrao para cada tarefa do processo de onboarding.
                Os prazos sao definidos em horas e podem variar entre onboarding Normal e Urgente.
              </p>
            </div>
            <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
              <TaskDefinitionsTable tasks={tasks} users={users} />
            </Suspense>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-lg font-medium mb-2">Parametros de Alertas</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Configure os parametros globais que afetam o sistema de alertas e notificacoes.
              </p>
            </div>
            <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded-lg" />}>
              <GlobalSettings settings={settings} />
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
