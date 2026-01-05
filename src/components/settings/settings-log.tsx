import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { History, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { SettingsLog } from '@/lib/settings/actions'

interface SettingsLogListProps {
  logs: SettingsLog[]
}

const settingsLabels: Record<string, string> = {
  alert_hours_before_deadline: 'Alerta de Prazo',
  stalled_task_days: 'Tarefa Parada',
  price_deviation_threshold: 'Desvio de Preco',
}

export function SettingsLogList({ logs }: SettingsLogListProps) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sem alteracoes registadas</h3>
            <p className="text-muted-foreground">
              O historico de alteracoes as configuracoes aparecera aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (key === 'price_deviation_threshold') {
      return `${((value as number) * 100).toFixed(0)}%`
    }
    return String(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Historico de Alteracoes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    {settingsLabels[log.setting_key] || log.setting_key}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    alterado por{' '}
                    <span className="font-medium text-foreground">
                      {log.changed_by?.name || 'Sistema'}
                    </span>
                  </span>
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-muted-foreground line-through">
                    {formatValue(log.setting_key, log.old_value)}
                  </span>
                  {' → '}
                  <span className="font-medium">
                    {formatValue(log.setting_key, log.new_value)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(log.changed_at), {
                    addSuffix: true,
                    locale: pt,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
