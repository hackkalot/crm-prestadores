'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Calendar } from 'lucide-react'
import { format, isToday, isBefore, startOfDay } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { AgendaTask } from '@/lib/agenda/actions'
import { AgendaTaskCard } from './agenda-task-card'
import { cn } from '@/lib/utils'

interface AgendaWeekViewProps {
  weekTasks: Record<string, AgendaTask[]>
}

export function AgendaWeekView({ weekTasks }: AgendaWeekViewProps) {
  // Ordenar dias
  const days = Object.keys(weekTasks)
    .filter(key => key !== 'no-date')
    .sort()

  const noDateTasks = weekTasks['no-date'] || []

  return (
    <div className="space-y-6">
      {/* Tarefas sem prazo ou atrasadas */}
      {noDateTasks.length > 0 && (
        <Card className="border-amber-500 dark:border-amber-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Tarefas Atrasadas / Sem Prazo
              <Badge variant="secondary" className="ml-auto">
                {noDateTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {noDateTasks.map(task => (
              <AgendaTaskCard key={task.id} task={task} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dias da semana */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {days.map(dayKey => {
          const dayDate = new Date(dayKey)
          const tasks = weekTasks[dayKey] || []
          const isCurrentDay = isToday(dayDate)
          const isPast = isBefore(startOfDay(dayDate), startOfDay(new Date()))

          return (
            <Card
              key={dayKey}
              className={cn(
                'min-h-[200px]',
                isCurrentDay && 'ring-2 ring-primary',
                isPast && !isCurrentDay && 'opacity-60'
              )}
            >
              <CardHeader className={cn(
                'pb-2',
                isCurrentDay && 'bg-primary/10'
              )}>
                <CardTitle className="text-sm font-medium flex flex-col">
                  <span className="text-muted-foreground capitalize">
                    {format(dayDate, 'EEEE', { locale: pt })}
                  </span>
                  <span className={cn(
                    'text-2xl',
                    isCurrentDay && 'text-primary'
                  )}>
                    {format(dayDate, 'd')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Sem tarefas
                  </div>
                ) : (
                  <>
                    <Badge variant="secondary" className="mb-2">
                      {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </Badge>
                    {tasks.map(task => (
                      <AgendaTaskMini key={task.id} task={task} />
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// Versao mini do card para a vista semanal
function AgendaTaskMini({ task }: { task: AgendaTask }) {
  return (
    <a
      href={`/onboarding/${task.cardId}`}
      className={cn(
        'block p-2 rounded border text-xs hover:bg-accent transition-colors',
        task.isOverdue && 'border-red-500 bg-red-50 dark:bg-red-900/20',
        task.isUrgent && !task.isOverdue && 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
      )}
    >
      <div className="font-medium truncate">{task.taskName}</div>
      <div className="text-muted-foreground truncate">{task.providerName}</div>
      {task.dueDate && (
        <div className={cn(
          'mt-1',
          task.isOverdue && 'text-red-600'
        )}>
          {format(new Date(task.dueDate), 'HH:mm')}
        </div>
      )}
    </a>
  )
}
