'use client'

import { useEffect, useState, useActionState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  getOnboardingCard,
  updateTaskStatus,
  changeCardOwner,
  completeOnboarding,
} from '@/lib/onboarding/actions'
import {
  User,
  Building2,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  CheckCheck,
} from 'lucide-react'

interface CardDetailDialogProps {
  cardId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  users: Array<{ id: string; name: string | null; email: string }>
}

const entityTypeIcons: Record<string, typeof User> = {
  tecnico: User,
  eni: Briefcase,
  empresa: Building2,
}

const statusIcons: Record<string, typeof Circle> = {
  por_fazer: Circle,
  em_curso: Clock,
  concluida: CheckCircle2,
}

const statusLabels: Record<string, string> = {
  por_fazer: 'Por fazer',
  em_curso: 'Em curso',
  concluida: 'Concluida',
}

export function CardDetailDialog({
  cardId,
  open,
  onOpenChange,
  users,
}: CardDetailDialogProps) {
  const [card, setCard] = useState<Awaited<ReturnType<typeof getOnboardingCard>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('')
  const [taskState, taskAction, taskPending] = useActionState(updateTaskStatus, {})
  const [ownerState, ownerAction, ownerPending] = useActionState(changeCardOwner, {})
  const [completeState, completeAction, completePending] = useActionState(completeOnboarding, {})

  useEffect(() => {
    if (cardId && open) {
      setLoading(true)
      getOnboardingCard(cardId).then(data => {
        setCard(data)
        // Usar relationship_owner_id do provider
        const ownerId = (data?.provider as { relationship_owner_id?: string })?.relationship_owner_id
        if (ownerId) {
          setSelectedOwnerId(ownerId)
        }
        setLoading(false)
      })
    }
  }, [cardId, open, taskState, ownerState, completeState])

  // Helper to get the display label for the owner selector
  const getOwnerDisplayLabel = () => {
    if (!selectedOwnerId) return 'Selecionar...'

    // First check in users list
    const user = users.find(u => u.id === selectedOwnerId)
    if (user) return user.name || user.email || 'Utilizador'

    // If not in users list, check provider relationship_owner data
    if (card?.provider?.relationship_owner) {
      const owner = card.provider.relationship_owner as { name?: string; email?: string }
      return owner.name || owner.email || 'Utilizador'
    }

    return 'Selecionar...'
  }

  if (!open) return null

  const EntityIcon = entityTypeIcons[card?.provider?.entity_type || 'tecnico'] || User

  // Calcular progresso
  const tasks = card?.tasks || []
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t: { status: string }) => t.status === 'concluida').length
  const allCompleted = totalTasks > 0 && completedTasks === totalTasks

  // Verificar tarefas atrasadas
  const now = new Date()
  const hasOverdueTasks = tasks.some(
    (t: { status: string; deadline_at: string | null }) =>
      t.status !== 'concluida' && t.deadline_at && new Date(t.deadline_at) < now
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <EntityIcon className="h-5 w-5" />
              {card?.provider?.name || 'Carregando...'}
            </DialogTitle>
            {card?.onboarding_type === 'urgente' && (
              <Badge variant="warning">Urgente</Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : card ? (
          <div className="space-y-6">
            {/* Provider Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{card.provider?.email}</span>
                </div>
                {card.provider?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{card.provider.phone}</span>
                  </div>
                )}
                {card.provider?.districts && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">
                      {(card.provider.districts as string[]).join(', ')}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Inicio: {formatDate(card.started_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Etapa:</span>
                  <Badge variant="outline">
                    {(card.current_stage as { stage_number: string; name: string })?.stage_number} - {(card.current_stage as { stage_number: string; name: string })?.name}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Owner */}
            <div className="space-y-2">
              <Label>Responsavel</Label>
              <form action={ownerAction}>
                <input type="hidden" name="cardId" value={card.id} />
                <input type="hidden" name="ownerId" value={selectedOwnerId} />
                <div className="flex gap-2">
                  <Select
                    value={selectedOwnerId}
                    onValueChange={setSelectedOwnerId}
                  >
                    <SelectTrigger className="w-50">
                      <span className="truncate">{getOwnerDisplayLabel()}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {/* Se o owner atual nao esta na lista, adiciona-lo */}
                      {selectedOwnerId && !users.find(u => u.id === selectedOwnerId) && card.provider?.relationship_owner && (
                        <SelectItem key={selectedOwnerId} value={selectedOwnerId}>
                          {(card.provider.relationship_owner as { name?: string; email?: string }).name || (card.provider.relationship_owner as { name?: string; email?: string }).email || 'Utilizador'}
                        </SelectItem>
                      )}
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email || 'Utilizador'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={ownerPending}
                  >
                    {ownerPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Alterar'
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tarefas ({completedTasks}/{totalTasks})</Label>
                {hasOverdueTasks && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Atrasadas
                  </Badge>
                )}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {tasks
                  .sort((a: { task_definition?: { task_number: number } }, b: { task_definition?: { task_number: number } }) =>
                    (a.task_definition?.task_number || 0) - (b.task_definition?.task_number || 0)
                  )
                  .map((task: {
                    id: string
                    status: string
                    deadline_at: string | null
                    task_definition?: { task_number: number; name: string }
                    task_owner?: { name: string }
                  }) => {
                    const StatusIcon = statusIcons[task.status] || Circle
                    const isOverdue =
                      task.status !== 'concluida' &&
                      task.deadline_at &&
                      new Date(task.deadline_at) < now

                    return (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isOverdue ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon
                            className={`h-4 w-4 ${
                              task.status === 'concluida'
                                ? 'text-green-500'
                                : task.status === 'em_curso'
                                ? 'text-blue-500'
                                : 'text-muted-foreground'
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {task.task_definition?.task_number}. {task.task_definition?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {task.task_owner?.name || 'Sem responsavel'}
                              {task.deadline_at && (
                                <> • Prazo: {formatDate(task.deadline_at)}</>
                              )}
                            </p>
                          </div>
                        </div>

                        <form action={taskAction}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <Select
                            name="status"
                            defaultValue={task.status}
                            onValueChange={(value) => {
                              const form = document.createElement('form')
                              form.style.display = 'none'
                              const taskIdInput = document.createElement('input')
                              taskIdInput.name = 'taskId'
                              taskIdInput.value = task.id
                              const statusInput = document.createElement('input')
                              statusInput.name = 'status'
                              statusInput.value = value
                              form.appendChild(taskIdInput)
                              form.appendChild(statusInput)
                              document.body.appendChild(form)
                              taskAction(new FormData(form))
                              document.body.removeChild(form)
                            }}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              <span className="truncate">{statusLabels[task.status] || task.status}</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="por_fazer">Por fazer</SelectItem>
                              <SelectItem value="em_curso">Em curso</SelectItem>
                              <SelectItem value="concluida">Concluida</SelectItem>
                            </SelectContent>
                          </Select>
                        </form>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Complete Button */}
            {allCompleted && (
              <form action={completeAction} className="pt-4 border-t">
                <input type="hidden" name="cardId" value={card.id} />
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={completePending}
                >
                  {completePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  Concluir Onboarding e Ativar Prestador
                </Button>
              </form>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Card nao encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
