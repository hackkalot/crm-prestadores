'use client'

import { formatDateTime } from '@/lib/utils'
import {
  ArrowRightLeft,
  CheckCircle2,
  RotateCcw,
  UserCog,
  Calendar,
  FileText,
  AlertCircle,
} from 'lucide-react'

interface HistoryEntry {
  id: string
  event_type: string
  description: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  reason?: string
  created_at: string
  created_by_user?: {
    id: string
    name: string
  }
}

interface PrestadorHistorySectionProps {
  history: HistoryEntry[]
}

const eventTypeConfig: Record<
  string,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  stage_change: {
    icon: ArrowRightLeft,
    color: 'text-blue-500',
    label: 'Mudanca de Etapa',
  },
  task_completed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    label: 'Tarefa Concluida',
  },
  task_reopened: {
    icon: RotateCcw,
    color: 'text-orange-500',
    label: 'Tarefa Reaberta',
  },
  owner_change: {
    icon: UserCog,
    color: 'text-purple-500',
    label: 'Alteracao de Responsavel',
  },
  task_owner_change: {
    icon: UserCog,
    color: 'text-purple-400',
    label: 'Alteracao de Owner de Tarefa',
  },
  deadline_change: {
    icon: Calendar,
    color: 'text-amber-500',
    label: 'Alteracao de Prazo',
  },
  note_added: {
    icon: FileText,
    color: 'text-gray-500',
    label: 'Nota Adicionada',
  },
  status_change: {
    icon: AlertCircle,
    color: 'text-red-500',
    label: 'Alteracao de Estado',
  },
  price_change: {
    icon: AlertCircle,
    color: 'text-emerald-500',
    label: 'Alteracao de Precos',
  },
}

export function PrestadorHistorySection({ history }: PrestadorHistorySectionProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum histórico registado.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {history.map((entry) => {
          const config = eventTypeConfig[entry.event_type] || {
            icon: AlertCircle,
            color: 'text-gray-500',
            label: entry.event_type,
          }
          const Icon = config.icon

          return (
            <div key={entry.id} className="relative pl-10">
              {/* Timeline dot */}
              <div
                className={`absolute left-2 top-1.5 h-5 w-5 rounded-full bg-background border-2 flex items-center justify-center ${config.color}`}
                style={{ borderColor: 'currentColor' }}
              >
                <Icon className="h-3 w-3" />
              </div>

              {/* Content */}
              <div className="pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </span>
                </div>
                <p className="text-sm">{entry.description}</p>
                {entry.created_by_user && (
                  <p className="text-xs text-muted-foreground mt-1">
                    por {entry.created_by_user.name}
                  </p>
                )}
                {entry.reason && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Motivo: {entry.reason}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
