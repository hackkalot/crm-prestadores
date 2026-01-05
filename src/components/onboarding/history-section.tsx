'use client'

import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import {
  History,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  UserCog,
  Clock,
  MessageSquare,
  TrendingUp,
} from 'lucide-react'

interface HistoryEntry {
  id: string
  event_type: string
  description: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  reason: string | null
  created_at: string
  created_by_user?: {
    id: string
    name: string
  }
}

interface HistorySectionProps {
  history: HistoryEntry[]
}

const eventTypeConfig: Record<string, { icon: typeof History; label: string; color: string }> = {
  stage_change: { icon: ArrowRight, label: 'Mudanca de etapa', color: 'text-blue-500' },
  task_completed: { icon: CheckCircle2, label: 'Tarefa concluida', color: 'text-green-500' },
  task_reopened: { icon: RotateCcw, label: 'Tarefa reaberta', color: 'text-orange-500' },
  owner_change: { icon: UserCog, label: 'Owner alterado', color: 'text-purple-500' },
  task_owner_change: { icon: UserCog, label: 'Owner de tarefa alterado', color: 'text-purple-500' },
  deadline_change: { icon: Clock, label: 'Prazo alterado', color: 'text-yellow-500' },
  note_added: { icon: MessageSquare, label: 'Nota adicionada', color: 'text-gray-500' },
  status_change: { icon: TrendingUp, label: 'Estado alterado', color: 'text-cyan-500' },
  price_change: { icon: TrendingUp, label: 'Preco alterado', color: 'text-emerald-500' },
}

export function HistorySection({ history }: HistorySectionProps) {
  if (history.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Historico</h3>
        </div>
        <p className="text-center text-sm text-muted-foreground py-8">
          Nenhum evento registado.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium">Historico ({history.length})</h3>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        {/* Events */}
        <div className="space-y-4">
          {history.map((entry, index) => {
            const config = eventTypeConfig[entry.event_type] || {
              icon: History,
              label: entry.event_type,
              color: 'text-muted-foreground',
            }
            const Icon = config.icon

            return (
              <div key={entry.id} className="relative pl-10">
                {/* Icon */}
                <div className={`absolute left-0 p-2 rounded-full bg-background border ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="p-3 border rounded-lg bg-card">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {entry.created_by_user?.name || 'Sistema'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDateTime(entry.created_at)}
                    </span>
                  </div>

                  <p className="text-sm">{entry.description}</p>

                  {/* Show old/new values if available */}
                  {(entry.old_value || entry.new_value) && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {entry.old_value && (
                        <span className="inline-block mr-2">
                          De: <code className="bg-muted px-1 rounded">{JSON.stringify(entry.old_value)}</code>
                        </span>
                      )}
                      {entry.new_value && (
                        <span className="inline-block">
                          Para: <code className="bg-muted px-1 rounded">{JSON.stringify(entry.new_value)}</code>
                        </span>
                      )}
                    </div>
                  )}

                  {entry.reason && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      Motivo: {entry.reason}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
