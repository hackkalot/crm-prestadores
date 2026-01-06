'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  History,
  User as UserIcon,
  Plus,
  Pencil,
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  PlayCircle,
  UserCheck,
  Layers,
  Power,
  PauseCircle,
  XCircle,
  Send,
  RotateCcw,
  LogOut,
  ArrowRight,
  FileUp,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface HistoricoTabProps {
  history: Array<{
    id: string
    event_type: string
    description?: string | null
    old_value?: Record<string, unknown> | null
    new_value?: Record<string, unknown> | null
    created_at: string
    user?: { id: string; name: string; email: string } | null
  }>
}

interface EventConfig {
  label: string
  icon: LucideIcon
  bgColor: string
  iconColor: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'
}

const eventConfig: Record<string, EventConfig> = {
  created: {
    label: 'Criado',
    icon: Plus,
    bgColor: 'bg-blue-100 dark:bg-blue-950',
    iconColor: 'text-blue-600',
    badgeVariant: 'info',
  },
  updated: {
    label: 'Atualizado',
    icon: Pencil,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-600',
    badgeVariant: 'secondary',
  },
  status_changed: {
    label: 'Estado alterado',
    icon: RefreshCw,
    bgColor: 'bg-purple-100 dark:bg-purple-950',
    iconColor: 'text-purple-600',
    badgeVariant: 'default',
  },
  note_added: {
    label: 'Nota adicionada',
    icon: MessageSquare,
    bgColor: 'bg-yellow-100 dark:bg-yellow-950',
    iconColor: 'text-yellow-600',
    badgeVariant: 'warning',
  },
  task_completed: {
    label: 'Tarefa concluída',
    icon: CheckCircle2,
    bgColor: 'bg-green-100 dark:bg-green-950',
    iconColor: 'text-green-600',
    badgeVariant: 'success',
  },
  task_started: {
    label: 'Tarefa iniciada',
    icon: PlayCircle,
    bgColor: 'bg-blue-100 dark:bg-blue-950',
    iconColor: 'text-blue-600',
    badgeVariant: 'info',
  },
  owner_changed: {
    label: 'Responsável alterado',
    icon: UserCheck,
    bgColor: 'bg-orange-100 dark:bg-orange-950',
    iconColor: 'text-orange-600',
    badgeVariant: 'warning',
  },
  stage_changed: {
    label: 'Etapa alterada',
    icon: Layers,
    bgColor: 'bg-indigo-100 dark:bg-indigo-950',
    iconColor: 'text-indigo-600',
    badgeVariant: 'default',
  },
  activated: {
    label: 'Ativado',
    icon: Power,
    bgColor: 'bg-green-100 dark:bg-green-950',
    iconColor: 'text-green-600',
    badgeVariant: 'success',
  },
  suspended: {
    label: 'Suspenso',
    icon: PauseCircle,
    bgColor: 'bg-red-100 dark:bg-red-950',
    iconColor: 'text-red-600',
    badgeVariant: 'destructive',
  },
  abandoned: {
    label: 'Abandonado',
    icon: XCircle,
    bgColor: 'bg-red-100 dark:bg-red-950',
    iconColor: 'text-red-600',
    badgeVariant: 'destructive',
  },
  sent_to_onboarding: {
    label: 'Enviado para Onboarding',
    icon: Send,
    bgColor: 'bg-emerald-100 dark:bg-emerald-950',
    iconColor: 'text-emerald-600',
    badgeVariant: 'success',
  },
  recovered: {
    label: 'Candidatura Recuperada',
    icon: RotateCcw,
    bgColor: 'bg-green-100 dark:bg-green-950',
    iconColor: 'text-green-600',
    badgeVariant: 'success',
  },
  removed_from_onboarding: {
    label: 'Removido do Onboarding',
    icon: LogOut,
    bgColor: 'bg-orange-100 dark:bg-orange-950',
    iconColor: 'text-orange-600',
    badgeVariant: 'warning',
  },
  document_uploaded: {
    label: 'Documento Carregado',
    icon: FileUp,
    bgColor: 'bg-cyan-100 dark:bg-cyan-950',
    iconColor: 'text-cyan-600',
    badgeVariant: 'info',
  },
  document_deleted: {
    label: 'Documento Apagado',
    icon: Trash2,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-600',
    badgeVariant: 'secondary',
  },
}

const defaultConfig: EventConfig = {
  label: 'Evento',
  icon: History,
  bgColor: 'bg-gray-100 dark:bg-gray-800',
  iconColor: 'text-gray-600',
  badgeVariant: 'secondary',
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (Array.isArray(value)) return value.join(', ')
  return JSON.stringify(value)
}

function ValueChange({ oldValue, newValue }: { oldValue?: Record<string, unknown> | null; newValue?: Record<string, unknown> | null }) {
  if (!oldValue && !newValue) return null

  const allKeys = new Set([
    ...Object.keys(oldValue || {}),
    ...Object.keys(newValue || {}),
  ])

  const changedKeys = Array.from(allKeys).filter(key => {
    const old = oldValue?.[key]
    const newVal = newValue?.[key]
    return JSON.stringify(old) !== JSON.stringify(newVal)
  })

  if (changedKeys.length === 0) return null

  return (
    <div className="mt-2 space-y-1">
      {changedKeys.slice(0, 3).map(key => (
        <div key={key} className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
          {oldValue?.[key] !== undefined && (
            <span className="line-through text-muted-foreground">{formatValue(oldValue[key])}</span>
          )}
          {oldValue?.[key] !== undefined && newValue?.[key] !== undefined && (
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          )}
          {newValue?.[key] !== undefined && (
            <span className="font-medium">{formatValue(newValue[key])}</span>
          )}
        </div>
      ))}
      {changedKeys.length > 3 && (
        <span className="text-xs text-muted-foreground">+{changedKeys.length - 3} alterações</span>
      )}
    </div>
  )
}

export function HistoricoTab({ history }: HistoricoTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              Sem histórico registado.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6">
              {history.map((item) => {
                const config = eventConfig[item.event_type] || defaultConfig
                const Icon = config.icon

                return (
                  <div key={item.id} className="relative flex gap-4 pl-1">
                    {/* Icon */}
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={config.badgeVariant}>
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-sm text-foreground mt-1">{item.description}</p>
                      )}

                      <ValueChange oldValue={item.old_value} newValue={item.new_value} />

                      {item.user && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                          <UserIcon className="h-3.5 w-3.5" />
                          <span>{item.user.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
