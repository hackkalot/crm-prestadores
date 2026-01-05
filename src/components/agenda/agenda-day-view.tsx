'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, ListTodo } from 'lucide-react'
import type { AgendaTask } from '@/lib/agenda/actions'
import { AgendaTaskCard } from './agenda-task-card'

interface AgendaDayViewProps {
  tasks: AgendaTask[]
}

export function AgendaDayView({ tasks }: AgendaDayViewProps) {
  // Agrupar por estado
  const overdueTasks = tasks.filter(t => t.isOverdue)
  const pendingTasks = tasks.filter(t => !t.isOverdue && t.status !== 'completed')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sem tarefas para este dia</h3>
            <p className="text-muted-foreground max-w-md">
              Nao tem tarefas atribuidas para este dia. Navegue para outro dia ou semana para ver as suas tarefas.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tarefas em atraso */}
      {overdueTasks.length > 0 && (
        <TaskSection
          title="Em Atraso"
          tasks={overdueTasks}
          variant="destructive"
        />
      )}

      {/* Tarefas pendentes */}
      {pendingTasks.length > 0 && (
        <TaskSection
          title="Pendentes"
          tasks={pendingTasks}
          variant="default"
        />
      )}

      {/* Tarefas concluidas */}
      {completedTasks.length > 0 && (
        <TaskSection
          title="Concluidas"
          tasks={completedTasks}
          variant="muted"
        />
      )}
    </div>
  )
}

function TaskSection({
  title,
  tasks,
  variant
}: {
  title: string
  tasks: AgendaTask[]
  variant: 'destructive' | 'default' | 'muted'
}) {
  return (
    <Card className={variant === 'destructive' ? 'border-red-500 dark:border-red-700' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          {title}
          <span className="text-muted-foreground font-normal">({tasks.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map(task => (
          <AgendaTaskCard key={task.id} task={task} />
        ))}
      </CardContent>
    </Card>
  )
}
