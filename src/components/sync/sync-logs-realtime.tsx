'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, Download, Timer, Database } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { SyncLog, SyncStats } from '@/lib/sync/logs-actions'

interface SyncLogsRealtimeProps {
  logs: SyncLog[]
  stats: SyncStats
}

export function SyncLogsRealtime({ logs, stats }: SyncLogsRealtimeProps) {
  const router = useRouter()
  const hasInProgress = logs.some(log => log.status === 'in_progress')

  // Auto-refresh when there's an in_progress sync
  useEffect(() => {
    if (!hasInProgress) return

    const timer = setInterval(() => {
      router.refresh()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(timer)
  }, [hasInProgress, router])

  // Initial refresh after 2 seconds to catch newly started syncs
  // (when user is redirected here, the sync log may not be visible yet)
  useEffect(() => {
    const initialRefresh = setTimeout(() => {
      router.refresh()
    }, 2000)

    return () => clearTimeout(initialRefresh)
  }, [router])

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
            <CardTitle className="text-sm font-medium">Último Sync</CardTitle>
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
              <CardTitle>Histórico de Sincronizações</CardTitle>
              <CardDescription>Últimas 100 sincronizações com o backoffice</CardDescription>
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
                        {log.status === 'success' ? (
                          <Badge variant="success" className="flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Sucesso
                          </Badge>
                        ) : log.status === 'error' ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <XCircle className="h-3 w-3" />
                            Erro
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3 animate-spin" />
                            Em progresso
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {new Date(log.triggered_at).toLocaleDateString('pt-PT')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.triggered_at).toLocaleTimeString('pt-PT')}
                          </span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{log.user?.name || 'Sistema'}</span>
                          <span className="text-xs text-muted-foreground">{log.user?.email}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="text-xs">
                          {new Date(log.date_from).toLocaleDateString('pt-PT')} →{' '}
                          {new Date(log.date_to).toLocaleDateString('pt-PT')}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-medium">{log.records_processed || 0}</span>
                          {log.records_inserted > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {log.records_inserted} novos
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        {log.duration_seconds ? (
                          <span className="font-medium">{log.duration_seconds}s</span>
                        ) : log.status === 'in_progress' ? (
                          <span className="text-muted-foreground animate-pulse">...</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
