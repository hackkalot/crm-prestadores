'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { saveBackUrl } from '@/hooks/use-navigation-state'
import {
  Building2,
  User,
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  GripVertical,
  Flame,
  Pause,
  MapPin,
  Wrench,
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface KanbanCardProps {
  card: {
    id: string
    onboarding_type: string
    started_at: string
    provider?: {
      id: string
      name: string
      entity_type: string
      email: string
      phone?: string | null
      districts?: string[] | null
      services?: string[] | null
      relationship_owner?: {
        id: string
        name: string
      }
    }
    tasks?: Array<{
      id: string
      status: string
      deadline_at: string | null
      updated_at?: string | null
    }>
  }
  // Configuracoes de alertas vindas do servidor
  alertConfig?: {
    hoursBeforeDeadline: number
    stalledDays: number
  }
}

const entityTypeIcons: Record<string, typeof User> = {
  tecnico: User,
  eni: Briefcase,
  empresa: Building2,
}

export function KanbanCard({ card, alertConfig }: KanbanCardProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const EntityIcon = entityTypeIcons[card.provider?.entity_type || 'tecnico'] || User

  // Calcular progresso de tarefas
  const tasks = card.tasks || []
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'concluida').length
  const inProgressTasks = tasks.filter(t => t.status === 'em_curso').length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Verificar tarefas atrasadas
  const now = new Date()
  const hasOverdueTasks = tasks.some(
    t => t.status !== 'concluida' && t.deadline_at && new Date(t.deadline_at) < now
  )

  // Calcular riscos usando configuracoes
  const hoursBeforeDeadline = alertConfig?.hoursBeforeDeadline || 24
  const stalledDays = alertConfig?.stalledDays || 3

  const alertThreshold = new Date(Date.now() + hoursBeforeDeadline * 60 * 60 * 1000)
  const stalledThreshold = new Date(Date.now() - stalledDays * 24 * 60 * 60 * 1000)

  // Verificar prazos proximos de expirar (mas nao atrasados)
  const hasApproachingDeadline = tasks.some(
    t => t.status !== 'concluida' &&
      t.deadline_at &&
      new Date(t.deadline_at) > now &&
      new Date(t.deadline_at) <= alertThreshold
  )

  // Verificar tarefas paradas
  const hasStalledTasks = tasks.some(
    t => t.status !== 'concluida' &&
      t.updated_at &&
      new Date(t.updated_at) < stalledThreshold
  )

  // Determinar se o card esta "Em Risco"
  const isAtRisk = hasOverdueTasks || hasApproachingDeadline || hasStalledTasks

  // Calcular proxima deadline
  const upcomingDeadlines = tasks
    .filter(t => t.status !== 'concluida' && t.deadline_at)
    .map(t => new Date(t.deadline_at!))
    .sort((a, b) => a.getTime() - b.getTime())
  const nextDeadline = upcomingDeadlines[0]

  // Preparar tooltips de risco
  const riskReasons: string[] = []
  if (hasOverdueTasks) riskReasons.push('Tarefa atrasada')
  if (hasApproachingDeadline) riskReasons.push('Prazo a expirar')
  if (hasStalledTasks) riskReasons.push('Tarefa parada')

  const handleCardClick = (e: React.MouseEvent) => {
    // Nao navegar se clicar no drag handle
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      e.preventDefault()
      return
    }
    // Save current URL with filters before navigating
    const queryString = searchParams.toString()
    const fullUrl = queryString ? `${pathname}?${queryString}` : pathname
    saveBackUrl(fullUrl)
    window.location.href = `/providers/${card.provider?.id}?tab=onboarding`
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        hasOverdueTasks
          ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
          : hasApproachingDeadline
            ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
            : hasStalledTasks
              ? 'border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20'
              : ''
      } ${card.onboarding_type === 'urgente' ? 'border-l-4 border-l-orange-500' : ''}`}
    >
      <CardContent className="p-3">
        {/* Header com drag handle */}
        <div className="flex items-start gap-2 mb-2">
          <div
            data-drag-handle
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground touch-none"
          >
            <GripVertical className="h-4 w-4" />
          </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <EntityIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{card.provider?.name}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {card.provider?.email}
              </p>
            </div>

            {/* Risk indicator */}
            {isAtRisk && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                      hasOverdueTasks
                        ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                        : hasApproachingDeadline
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                    }`}>
                      {hasOverdueTasks ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : hasStalledTasks ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Flame className="h-3 w-3" />
                      )}
                      <span>Risco</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <ul className="text-xs">
                      {riskReasons.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {card.onboarding_type === 'urgente' && !isAtRisk && (
              <Badge variant="warning" className="text-xs flex-shrink-0">
                Urgente
              </Badge>
            )}
          </div>

          {/* Tags de zonas e servicos */}
          {((card.provider?.districts && card.provider.districts.length > 0) ||
            (card.provider?.services && card.provider.services.length > 0)) && (
            <div className="flex flex-wrap gap-1 mb-2">
              {/* Zonas - mostrar ate 2 */}
              {card.provider?.districts?.slice(0, 2).map((district) => (
                <TooltipProvider key={district}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 gap-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[50px]">{district}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {district}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {card.provider?.districts && card.provider.districts.length > 2 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      >
                        +{card.provider.districts.length - 2}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div className="flex flex-col gap-0.5">
                        {card.provider.districts.slice(2).map((d) => (
                          <span key={d}>{d}</span>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Servicos - mostrar ate 2 */}
              {card.provider?.services?.slice(0, 2).map((service) => (
                <TooltipProvider key={service}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 gap-0.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                      >
                        <Wrench className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[50px]">{service}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {service}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {card.provider?.services && card.provider.services.length > 2 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                      >
                        +{card.provider.services.length - 2}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div className="flex flex-col gap-0.5">
                        {card.provider.services.slice(2).map((s) => (
                          <span key={s}>{s}</span>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}

          {/* Progress */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  hasOverdueTasks ? 'bg-red-500' : 'bg-primary'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Task summary */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>{completedTasks}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" />
              <span>{inProgressTasks}</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="h-3 w-3" />
              <span>{totalTasks - completedTasks - inProgressTasks}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs">
            {hasOverdueTasks ? (
              <div className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="h-3 w-3" />
                <span>Atrasado</span>
              </div>
            ) : nextDeadline ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDate(nextDeadline)}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Sem prazos</span>
            )}

            {card.provider?.relationship_owner && (
              <span className="text-muted-foreground truncate max-w-[80px]">
                {card.provider.relationship_owner.name.split(' ')[0]}
              </span>
            )}
          </div>
        </CardContent>
    </Card>
  )
}
