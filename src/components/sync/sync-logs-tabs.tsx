'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, Download, Timer, Database, FileText, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { SyncLog, SyncStats, ProviderSyncLog, ProviderSyncStats } from '@/lib/sync/logs-actions'

interface SyncLogsTabsProps {
  activeTab: string
  serviceLogs: SyncLog[]
  serviceStats: SyncStats
  providerLogs: ProviderSyncLog[]
  providerStats: ProviderSyncStats
}

export function SyncLogsTabs({
  activeTab,
  serviceLogs,
  serviceStats,
  providerLogs,
  providerStats,
}: SyncLogsTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for in-progress syncs
  const hasServiceInProgress = serviceLogs.some(log => log.status === 'in_progress')
  const hasProviderInProgress = providerLogs.some(log => log.status === 'in_progress')
  const hasInProgress = hasServiceInProgress || hasProviderInProgress

  // Auto-refresh when there's an in_progress sync
  useEffect(() => {
    if (!hasInProgress) return

    const timer = setInterval(() => {
      router.refresh()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(timer)
  }, [hasInProgress, router])

  // Initial refresh after 2 seconds to catch newly started syncs
  useEffect(() => {
    const initialRefresh = setTimeout(() => {
      router.refresh()
    }, 2000)

    return () => clearTimeout(initialRefresh)
  }, [router])

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`/configuracoes/sync-logs?${params.toString()}`)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList>
        <TabsTrigger value="pedidos" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Pedidos de Servico
          {hasServiceInProgress && (
            <Clock className="h-3 w-3 animate-spin text-blue-500" />
          )}
        </TabsTrigger>
        <TabsTrigger value="providers" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Prestadores
          {hasProviderInProgress && (
            <Clock className="h-3 w-3 animate-spin text-blue-500" />
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pedidos">
        <ServiceLogsContent logs={serviceLogs} stats={serviceStats} hasInProgress={hasServiceInProgress} />
      </TabsContent>

      <TabsContent value="providers">
        <ProviderLogsContent logs={providerLogs} stats={providerStats} hasInProgress={hasProviderInProgress} />
      </TabsContent>
    </Tabs>
  )
}

// Service Requests Logs Content
function ServiceLogsContent({ logs, stats, hasInProgress }: { logs: SyncLog[]; stats: SyncStats; hasInProgress: boolean }) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Syncs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.success} sucesso, {stats.error} erros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registos Processados</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecordsProcessed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total de todos os syncs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration}s</div>
            <p className="text-xs text-muted-foreground">
              Syncs bem-sucedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ultimo Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastSync ? (
                <Badge variant={stats.lastSync.status === 'success' ? 'success' : stats.lastSync.status === 'in_progress' ? 'secondary' : 'destructive'}>
                  {stats.lastSync.status === 'in_progress' ? 'Em progresso' : stats.lastSync.status}
                </Badge>
              ) : (
                'N/A'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lastSync
                ? formatDistanceToNow(new Date(stats.lastSync.triggered_at), { addSuffix: true, locale: pt })
                : 'Nenhum sync ainda'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historico de Sincronizações - Pedidos</CardTitle>
              <CardDescription>Ultimas 100 sincronizações de pedidos de serviço</CardDescription>
            </div>
            {hasInProgress && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 animate-spin" />
                <span>A atualizar automaticamente...</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum sync realizado ainda
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Data/Hora</th>
                    <th className="text-left p-2 font-medium">Utilizador</th>
                    <th className="text-left p-2 font-medium">Periodo</th>
                    <th className="text-right p-2 font-medium">Registos</th>
                    <th className="text-right p-2 font-medium">Duração</th>
                    <th className="text-left p-2 font-medium">Ficheiro</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className={`border-b hover:bg-muted/50 ${log.status === 'in_progress' ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                      <td className="p-2">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="p-2">
                        <DateDisplay date={log.triggered_at} />
                      </td>
                      <td className="p-2">
                        <UserDisplay user={log.user} />
                      </td>
                      <td className="p-2">
                        <span className="text-xs">
                          {new Date(log.date_from).toLocaleDateString('pt-PT')} →{' '}
                          {new Date(log.date_to).toLocaleDateString('pt-PT')}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <RecordsDisplay log={log} />
                      </td>
                      <td className="p-2 text-right">
                        <DurationDisplay duration={log.duration_seconds} status={log.status} />
                      </td>
                      <td className="p-2">
                        {log.excel_file_size_kb && (
                          <span className="text-xs text-muted-foreground">
                            {log.excel_file_size_kb} KB
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Provider Logs Content
function ProviderLogsContent({ logs, stats, hasInProgress }: { logs: ProviderSyncLog[]; stats: ProviderSyncStats; hasInProgress: boolean }) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Syncs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.success} sucesso, {stats.error} erros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prestadores Processados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecordsProcessed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total de todos os syncs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration}s</div>
            <p className="text-xs text-muted-foreground">
              Syncs bem-sucedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ultimo Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastSync ? (
                <Badge variant={stats.lastSync.status === 'success' ? 'success' : stats.lastSync.status === 'in_progress' ? 'secondary' : 'destructive'}>
                  {stats.lastSync.status === 'in_progress' ? 'Em progresso' : stats.lastSync.status}
                </Badge>
              ) : (
                'N/A'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lastSync
                ? formatDistanceToNow(new Date(stats.lastSync.triggered_at), { addSuffix: true, locale: pt })
                : 'Nenhum sync ainda'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historico de Sincronizações - Prestadores</CardTitle>
              <CardDescription>Ultimas 100 sincronizações de prestadores</CardDescription>
            </div>
            {hasInProgress && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 animate-spin" />
                <span>A atualizar automaticamente...</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum sync de prestadores realizado ainda
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Data/Hora</th>
                    <th className="text-left p-2 font-medium">Utilizador</th>
                    <th className="text-right p-2 font-medium">Registos</th>
                    <th className="text-right p-2 font-medium">Duração</th>
                    <th className="text-left p-2 font-medium">Ficheiro</th>
                    <th className="text-left p-2 font-medium">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className={`border-b hover:bg-muted/50 ${log.status === 'in_progress' ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                      <td className="p-2">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="p-2">
                        <DateDisplay date={log.triggered_at} />
                      </td>
                      <td className="p-2">
                        <UserDisplay user={log.user} />
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-medium">{log.records_processed || 0}</span>
                          <span className="text-xs text-muted-foreground">
                            {log.records_inserted > 0 && `${log.records_inserted} novos`}
                            {log.records_inserted > 0 && log.records_updated > 0 && ', '}
                            {log.records_updated > 0 && `${log.records_updated} atualizados`}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <DurationDisplay duration={log.duration_seconds} status={log.status} />
                      </td>
                      <td className="p-2">
                        {log.excel_file_size_kb && (
                          <span className="text-xs text-muted-foreground">
                            {log.excel_file_size_kb} KB
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {log.error_message && (
                          <span className="text-xs text-destructive" title={log.error_stack || undefined}>
                            {log.error_message.substring(0, 50)}...
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Shared Components
function StatusBadge({ status }: { status: string }) {
  if (status === 'success') {
    return (
      <Badge variant="success" className="flex items-center gap-1 w-fit">
        <CheckCircle className="h-3 w-3" />
        Sucesso
      </Badge>
    )
  }
  if (status === 'error') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
        <XCircle className="h-3 w-3" />
        Erro
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
      <Clock className="h-3 w-3 animate-spin" />
      Em progresso
    </Badge>
  )
}

function DateDisplay({ date }: { date: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-medium">
        {new Date(date).toLocaleDateString('pt-PT')}
      </span>
      <span className="text-xs text-muted-foreground">
        {new Date(date).toLocaleTimeString('pt-PT')}
      </span>
    </div>
  )
}

function UserDisplay({ user }: { user: { name: string; email: string } | null }) {
  return (
    <div className="flex flex-col">
      <span className="font-medium">{user?.name || 'Sistema'}</span>
      <span className="text-xs text-muted-foreground">{user?.email}</span>
    </div>
  )
}

function RecordsDisplay({ log }: { log: SyncLog }) {
  return (
    <div className="flex flex-col items-end">
      <span className="font-medium">{log.records_processed || 0}</span>
      {log.records_inserted > 0 && (
        <span className="text-xs text-muted-foreground">
          {log.records_inserted} novos
        </span>
      )}
    </div>
  )
}

function DurationDisplay({ duration, status }: { duration: number | null; status: string }) {
  if (duration) {
    return <span className="font-medium">{duration}s</span>
  }
  if (status === 'in_progress') {
    return <span className="text-muted-foreground animate-pulse">...</span>
  }
  return <span className="text-muted-foreground">-</span>
}
