'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OnboardingTaskList } from '@/components/onboarding/onboarding-task-list'
import { OnboardingActions } from '@/components/onboarding/onboarding-actions'
import { formatDateTime } from '@/lib/utils'
import { ListTodo, Clock, User as UserIcon } from 'lucide-react'

interface OnboardingTabProps {
  provider: {
    id: string
    name: string
    status: string
    relationship_owner?: { id: string; name: string; email: string } | null
  }
  onboardingCard: {
    id: string
    onboarding_type: string
    started_at: string
    current_stage?: { id: string; name: string; stage_number: number } | null
    tasks: Array<{
      id: string
      status: string
      deadline_at: string | null
      started_at: string | null
      completed_at: string | null
      task_definition: { id: string; name: string; task_number?: number; description?: string; stage?: { id: string; name: string; stage_number: number } } | null
      stage: { id: string; name: string; stage_number: number } | null
      task_owner?: { id: string; name: string; email: string } | null
    }>
  }
  users: Array<{ id: string; name: string; email: string }>
}

export function OnboardingTab({ provider, onboardingCard, users }: OnboardingTabProps) {
  const tasks = onboardingCard.tasks || []
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'concluida').length

  return (
    <div className="space-y-6">
      {/* Header com info e ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant={onboardingCard.onboarding_type === 'urgente' ? 'warning' : 'secondary'}>
            {onboardingCard.onboarding_type === 'urgente' ? 'Urgente' : 'Normal'}
          </Badge>

          {onboardingCard.current_stage && (
            <div className="flex items-center gap-2 text-sm">
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              <span>
                Etapa {onboardingCard.current_stage.stage_number}: {onboardingCard.current_stage.name}
              </span>
            </div>
          )}

          {provider.relationship_owner && (
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <span>{provider.relationship_owner.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Início: {formatDateTime(onboardingCard.started_at)}</span>
          </div>
        </div>

        <OnboardingActions
          cardId={onboardingCard.id}
          ownerId={provider.relationship_owner?.id}
          ownerName={provider.relationship_owner?.name || provider.relationship_owner?.email}
          users={users}
          canComplete={completedTasks === totalTasks && totalTasks > 0}
        />
      </div>

      {/* Lista de Tarefas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Tarefas ({completedTasks}/{totalTasks})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OnboardingTaskList
            tasks={tasks as never[]}
            cardId={onboardingCard.id}
            currentStageId={onboardingCard.current_stage?.id}
            providerId={provider.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
