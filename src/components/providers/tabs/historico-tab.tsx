'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Filter,
  X as XIcon,
  Clock,
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
  field_change: {
    label: 'Campo Alterado',
    icon: Pencil,
    bgColor: 'bg-blue-100 dark:bg-blue-950',
    iconColor: 'text-blue-600',
    badgeVariant: 'info',
  },
  status_change: {
    label: 'Estado Alterado',
    icon: RefreshCw,
    bgColor: 'bg-purple-100 dark:bg-purple-950',
    iconColor: 'text-purple-600',
    badgeVariant: 'default',
  },
  owner_change: {
    label: 'Responsável Alterado',
    icon: UserCheck,
    bgColor: 'bg-orange-100 dark:bg-orange-950',
    iconColor: 'text-orange-600',
    badgeVariant: 'warning',
  },
  task_reopened: {
    label: 'Tarefa Reaberta',
    icon: RotateCcw,
    bgColor: 'bg-yellow-100 dark:bg-yellow-950',
    iconColor: 'text-yellow-600',
    badgeVariant: 'warning',
  },
  task_owner_change: {
    label: 'Responsável da Tarefa Alterado',
    icon: UserCheck,
    bgColor: 'bg-orange-100 dark:bg-orange-950',
    iconColor: 'text-orange-600',
    badgeVariant: 'warning',
  },
  deadline_change: {
    label: 'Prazo Alterado',
    icon: Clock,
    bgColor: 'bg-amber-100 dark:bg-amber-950',
    iconColor: 'text-amber-600',
    badgeVariant: 'warning',
  },
  price_change: {
    label: 'Preço Alterado',
    icon: RefreshCw,
    bgColor: 'bg-emerald-100 dark:bg-emerald-950',
    iconColor: 'text-emerald-600',
    badgeVariant: 'success',
  },
  stage_change: {
    label: 'Etapa Alterada',
    icon: Layers,
    bgColor: 'bg-indigo-100 dark:bg-indigo-950',
    iconColor: 'text-indigo-600',
    badgeVariant: 'default',
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
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')

  // Get unique event types and users
  const eventTypes = useMemo(() => {
    const types = new Set(history.map(item => item.event_type))
    return Array.from(types).sort()
  }, [history])

  const users = useMemo(() => {
    const uniqueUsers = new Map<string, { id: string; name: string }>()
    history.forEach(item => {
      if (item.user && !uniqueUsers.has(item.user.id)) {
        uniqueUsers.set(item.user.id, item.user)
      }
    })
    return Array.from(uniqueUsers.values())
  }, [history])

  // Filter history
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      if (eventTypeFilter !== 'all' && item.event_type !== eventTypeFilter) {
        return false
      }
      if (userFilter !== 'all' && item.user?.id !== userFilter) {
        return false
      }
      return true
    })
  }, [history, eventTypeFilter, userFilter])

  const hasFilters = eventTypeFilter !== 'all' || userFilter !== 'all'

  const clearFilters = () => {
    setEventTypeFilter('all')
    setUserFilter('all')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico ({filteredHistory.length}{history.length !== filteredHistory.length && ` de ${history.length}`})
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 gap-1"
              >
                <XIcon className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {(eventTypes.length > 0 || users.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-3">
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[200px] h-8">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {eventTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {eventConfig[type]?.label || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {users.length > 0 && (
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue placeholder="Utilizador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os utilizadores</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              {hasFilters ? 'Nenhum evento encontrado com os filtros selecionados.' : 'Sem histórico registado.'}
            </p>
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6">
              {filteredHistory.map((item) => {
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
