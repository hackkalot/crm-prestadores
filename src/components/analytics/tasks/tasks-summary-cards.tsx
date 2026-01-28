'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ListTodo,
  CheckCircle2,
  Clock,
  Timer,
  Users,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import type { TasksSummary } from '@/lib/analytics/types'

interface TasksSummaryCardsProps {
  data: TasksSummary
}

function TrendIndicator({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const isPositive = inverted ? value < 0 : value > 0
  const isNeutral = value === 0
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
  const colorClass = isNeutral
    ? 'text-muted-foreground'
    : isPositive
      ? 'text-green-600'
      : 'text-red-600'

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{Math.abs(value)}%</span>
    </div>
  )
}

export function TasksSummaryCards({ data }: TasksSummaryCardsProps) {
  const hasTrends = data.totalTasksPrev > 0 || data.totalTasksTrend !== 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Card 1: Total Tarefas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Total Tarefas</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-sm">
                        Tarefas do backoffice criadas no período (por creation_date)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.totalTasks.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.totalTasksTrend} />}
                {hasTrends && (
                  <span className="text-xs text-muted-foreground">
                    (ant: {data.totalTasksPrev.toLocaleString('pt-PT')})
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
              <ListTodo className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Concluídas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-sm">
                        Tarefas com status concluído/done
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.completedTasks.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.completedTasksTrend} />}
                <span className="text-xs text-muted-foreground">
                  {data.completedPercentage}% do total
                  {hasTrends && ` (ant: ${data.completedTasksPrev.toLocaleString('pt-PT')})`}
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Pendentes */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-sm">
                        Tarefas ainda não concluídas no período
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.pendingTasks.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.pendingTasksTrend} inverted />}
                {hasTrends && (
                  <span className="text-xs text-muted-foreground">
                    (ant: {data.pendingTasksPrev.toLocaleString('pt-PT')})
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Tempo Médio Conclusão */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        Média de dias entre criação e conclusão da tarefa
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">
                {data.avgCompletionDays !== null ? `${data.avgCompletionDays}d` : '-'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {data.avgCompletionDaysTrend !== 0 && (
                  <TrendIndicator value={data.avgCompletionDaysTrend} inverted />
                )}
                {data.avgCompletionDaysPrev !== null && (
                  <span className="text-xs text-muted-foreground">
                    (ant: {data.avgCompletionDaysPrev}d)
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-950">
              <Timer className="h-5 w-5 text-cyan-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 5: Colaboradores Ativos */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Colaboradores</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        Colaboradores distintos com tarefas atribuídas no período
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.distinctAssignees}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.distinctAssigneesTrend} />}
                {data.topAssignee && (
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={data.topAssignee}>
                    Top: {data.topAssignee}
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
