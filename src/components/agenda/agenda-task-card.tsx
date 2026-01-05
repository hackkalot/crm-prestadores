'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  AlertTriangle,
  Zap,
  Building2,
  User,
  Briefcase,
  ArrowRight
} from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { AgendaTask } from '@/lib/agenda/actions'
import { cn } from '@/lib/utils'

interface AgendaTaskCardProps {
  task: AgendaTask
}

const entityTypeLabels: Record<string, string> = {
  tecnico: 'Tecnico',
  eni: 'ENI',
  empresa: 'Empresa',
}

const entityTypeIcons: Record<string, React.ElementType> = {
  tecnico: User,
  eni: Briefcase,
  empresa: Building2,
}

export function AgendaTaskCard({ task }: AgendaTaskCardProps) {
  const EntityIcon = entityTypeIcons[task.providerType] || User

  return (
    <Link href={`/onboarding/${task.cardId}`}>
      <Card className={cn(
        'hover:shadow-md transition-shadow cursor-pointer',
        task.isOverdue && 'border-red-500 dark:border-red-700',
        task.isUrgent && !task.isOverdue && 'border-amber-500 dark:border-amber-700'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Header com badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {task.isOverdue && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Em Atraso
                  </Badge>
                )}
                {task.isUrgent && (
                  <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
                    <Zap className="h-3 w-3" />
                    Urgente
                  </Badge>
                )}
                <Badge variant="outline">
                  Etapa {task.stageNumber}
                </Badge>
              </div>

              {/* Nome da tarefa */}
              <h3 className="font-medium">{task.taskName}</h3>

              {/* Info do prestador */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <EntityIcon className="h-4 w-4" />
                <span>{task.providerName}</span>
                <span className="text-xs">({entityTypeLabels[task.providerType] || task.providerType})</span>
              </div>

              {/* Etapa */}
              <p className="text-sm text-muted-foreground">
                {task.stageName}
              </p>
            </div>

            {/* Prazo e acao */}
            <div className="flex flex-col items-end gap-2">
              {task.dueDate && (
                <div className={cn(
                  'flex items-center gap-1 text-sm',
                  task.isOverdue ? 'text-red-600' : 'text-muted-foreground'
                )}>
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(task.dueDate), "d MMM, HH:mm", { locale: pt })}</span>
                </div>
              )}

              <div className="flex items-center gap-1 text-sm text-primary mt-auto">
                <span>Ver detalhes</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
