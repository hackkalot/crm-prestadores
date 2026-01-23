'use client'

import { useState, useTransition, useMemo, useOptimistic, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { updateTaskStatus, rescheduleTaskDeadline } from '@/lib/onboarding/actions'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  CalendarClock,
  Loader2,
  Mail,
  ChevronDown,
  Euro,
} from 'lucide-react'
import { prepareTaskEmail } from '@/lib/email-templates/actions'
import { TaskPricingPanel } from './task-pricing-panel'
import type { PricingCluster } from '@/lib/providers/pricing-actions'

interface Stage {
  id: string
  name: string
  stage_number: string
  display_order: number
}

interface Task {
  id: string
  status: string
  deadline_at: string | null
  started_at: string | null
  completed_at: string | null
  task_definition?: {
    id: string
    name: string
    task_number: number
    description?: string
    stage?: Stage | Stage[]
    email_template_id?: string | null
  }
}

interface OnboardingTaskListProps {
  tasks: Task[]
  cardId?: string // Mantido para compatibilidade, mas nao usado
  currentStageId?: string
  providerId?: string // ID do prestador para gerar emails
  providerName?: string // Nome do prestador para exibição
  pricingData?: {
    clusters: PricingCluster[]
    providerServices: string[]
  } | null
}

const statusIcons = {
  por_fazer: Circle,
  em_curso: Clock,
  concluida: CheckCircle2,
}

const statusLabels = {
  por_fazer: 'Por fazer',
  em_curso: 'Em curso',
  concluida: 'Concluida',
}

// Helper para extrair stage (pode vir como array do Supabase)
function getStage(stage: Stage | Stage[] | undefined): Stage | undefined {
  if (!stage) return undefined
  return Array.isArray(stage) ? stage[0] : stage
}

// Helper para verificar se é a tarefa #4 da Etapa 2 (Enviar preçário)
function isPricingTask(task: Task): boolean {
  const stage = getStage(task.task_definition?.stage)
  return stage?.stage_number === '2' && task.task_definition?.task_number === 4
}

export function OnboardingTaskList({ tasks, currentStageId, providerId, providerName, pricingData }: OnboardingTaskListProps) {
  const [isPending, startTransition] = useTransition()
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newDeadline, setNewDeadline] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set())
  const [emailPendingTaskId, setEmailPendingTaskId] = useState<string | null>(null)
  const [expandedPricingTaskId, setExpandedPricingTaskId] = useState<string | null>(null)
  const router = useRouter()

  // Optimistic state for tasks
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    tasks,
    (currentTasks, { taskId, newStatus }: { taskId: string; newStatus: string }) =>
      currentTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: newStatus,
              completed_at: newStatus === 'concluida' ? new Date().toISOString() : task.completed_at,
              started_at: newStatus === 'em_curso' && !task.started_at ? new Date().toISOString() : task.started_at,
            }
          : task
      )
  )

  const now = new Date()

  // Agrupar tarefas por etapa (usa optimisticTasks para feedback instantaneo)
  const tasksByStage = useMemo(() => {
    const grouped = new Map<string, { stage: Stage; tasks: Task[] }>()

    for (const task of optimisticTasks) {
      const stage = getStage(task.task_definition?.stage)
      if (!stage) continue

      if (!grouped.has(stage.id)) {
        grouped.set(stage.id, { stage, tasks: [] })
      }
      grouped.get(stage.id)!.tasks.push(task)
    }

    // Ordenar por display_order da etapa
    const sortedGroups = Array.from(grouped.values()).sort(
      (a, b) => a.stage.display_order - b.stage.display_order
    )

    // Ordenar tarefas dentro de cada etapa
    for (const group of sortedGroups) {
      group.tasks.sort((a, b) => {
        const orderA = a.task_definition?.task_number || 0
        const orderB = b.task_definition?.task_number || 0
        return orderA - orderB
      })
    }

    return sortedGroups
  }, [optimisticTasks])

  // Calcular estatisticas por etapa
  const getStageStats = (stageTasks: Task[]) => {
    const total = stageTasks.length
    const completed = stageTasks.filter(t => t.status === 'concluida').length
    const hasOverdue = stageTasks.some(
      t => t.status !== 'concluida' && t.deadline_at && new Date(t.deadline_at) < now
    )
    return { total, completed, hasOverdue, isComplete: completed === total }
  }

  // Determinar quais etapas abrir por defeito (apenas a etapa atual)
  const defaultOpenStages = useMemo(() => {
    // Apenas expandir a etapa atual
    if (currentStageId) {
      return [currentStageId]
    }
    // Se não há etapa atual, expandir a primeira não concluída
    for (const group of tasksByStage) {
      const stats = getStageStats(group.tasks)
      if (!stats.isComplete) {
        return [group.stage.id]
      }
    }
    return []
  }, [tasksByStage, currentStageId])

  const handleStatusChange = useCallback((taskId: string, newStatus: string, taskName?: string) => {
    // Marcar tarefa como pendente (para mostrar loading no botao)
    setPendingTaskIds(prev => new Set(prev).add(taskId))

    startTransition(async () => {
      // Aplicar update otimista imediatamente
      setOptimisticTasks({ taskId, newStatus })

      const formData = new FormData()
      formData.append('taskId', taskId)
      formData.append('status', newStatus)
      const result = await updateTaskStatus({}, formData)

      // Remover do estado pendente
      setPendingTaskIds(prev => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })

      if (result.error) {
        toast.error(result.error)
        router.refresh() // Reverter ao estado real em caso de erro
        return
      }

      if (result.success) {
        if (newStatus === 'concluida') {
          toast.success(`Tarefa "${taskName}" concluida`)
        }

        if (result.movedToNextStage) {
          toast.success('Etapa concluida! Card movido para a proxima etapa.', {
            duration: 5000,
          })
          router.refresh()
        }
      }
    })
  }, [router, setOptimisticTasks])

  const openRescheduleDialog = (task: Task) => {
    setSelectedTask(task)
    if (task.deadline_at) {
      setNewDeadline(task.deadline_at.slice(0, 16))
    } else {
      setNewDeadline('')
    }
    setRescheduleReason('')
    setRescheduleOpen(true)
  }

  const handleReschedule = () => {
    if (!selectedTask || !newDeadline) return

    startTransition(async () => {
      const formData = new FormData()
      formData.append('taskId', selectedTask.id)
      formData.append('newDeadline', newDeadline)
      formData.append('reason', rescheduleReason)
      const result = await rescheduleTaskDeadline({}, formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.success) {
        toast.success('Prazo reagendado com sucesso')
        setRescheduleOpen(false)
        setSelectedTask(null)
        router.refresh()
      }
    })
  }

  const handleSendEmail = useCallback(async (task: Task) => {
    if (!providerId || !task.task_definition?.id) {
      toast.error('Dados insuficientes para enviar email')
      return
    }

    setEmailPendingTaskId(task.id)
    try {
      const baseUrl = window.location.origin
      const result = await prepareTaskEmail(task.task_definition.id, providerId, baseUrl)

      if (!result.success || !result.mailtoUrl) {
        toast.error(result.error || 'Erro ao preparar email')
        return
      }

      // Open mailto link
      window.location.href = result.mailtoUrl
      toast.success('A abrir cliente de email...')
    } catch (error) {
      console.error('Error preparing email:', error)
      toast.error('Erro ao preparar email')
    } finally {
      setEmailPendingTaskId(null)
    }
  }, [providerId])

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma tarefa definida para este onboarding.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Accordion type="multiple" defaultValue={defaultOpenStages} className="space-y-2">
        {tasksByStage.map(({ stage, tasks: stageTasks }) => {
          const stats = getStageStats(stageTasks)
          const isCurrentStage = stage.id === currentStageId

          return (
            <AccordionItem
              key={stage.id}
              value={stage.id}
              className={`border rounded-lg ${
                isCurrentStage
                  ? 'border-primary/50 bg-primary/5'
                  : stats.isComplete
                    ? 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20'
                    : stats.hasOverdue
                      ? 'border-red-200 dark:border-red-900'
                      : ''
              }`}
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 w-full">
                  <Badge
                    variant={stats.isComplete ? 'success' : isCurrentStage ? 'default' : 'outline'}
                    className="font-mono"
                  >
                    {stage.stage_number}
                  </Badge>
                  <span className="font-medium">{stage.name}</span>
                  {isCurrentStage && (
                    <Badge variant="secondary" className="text-xs">
                      Atual
                    </Badge>
                  )}
                  <div className="ml-auto flex items-center gap-2 mr-2">
                    {stats.hasOverdue && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {stats.completed}/{stats.total}
                    </span>
                    {stats.isComplete && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-2">
                  {stageTasks.map((task) => {
                    const StatusIcon = statusIcons[task.status as keyof typeof statusIcons] || Circle
                    const isOverdue = task.status !== 'concluida' && task.deadline_at && new Date(task.deadline_at) < now
                    const showPricingExpansion = isPricingTask(task) && pricingData && task.status !== 'concluida'
                    const isPricingExpanded = expandedPricingTaskId === task.id

                    // Wrapper for pricing task (expandable)
                    if (showPricingExpansion) {
                      return (
                        <Collapsible
                          key={task.id}
                          open={isPricingExpanded}
                          onOpenChange={(open) => setExpandedPricingTaskId(open ? task.id : null)}
                        >
                          <div
                            className={`rounded-lg border transition-colors ${
                              task.status === 'concluida'
                                ? 'border-green-200 dark:border-green-900'
                                : isOverdue
                                  ? 'border-red-200 dark:border-red-900'
                                  : task.status === 'em_curso'
                                    ? 'border-blue-200 dark:border-blue-900'
                                    : ''
                            } ${isPricingExpanded ? 'ring-2 ring-primary/50' : ''}`}
                          >
                            {/* Task Header - only this part gets the background color */}
                            <div className={`flex items-center gap-4 p-3 rounded-t-lg ${
                              task.status === 'concluida'
                                ? 'bg-green-50 dark:bg-green-950/30'
                                : isOverdue
                                  ? 'bg-red-50 dark:bg-red-950/30'
                                  : task.status === 'em_curso'
                                    ? 'bg-blue-50 dark:bg-blue-950/30'
                                    : 'bg-card'
                            }`}>
                              {/* Status Icon */}
                              <div className={`shrink-0 ${
                                task.status === 'concluida'
                                  ? 'text-green-500'
                                  : isOverdue
                                    ? 'text-red-500'
                                    : task.status === 'em_curso'
                                      ? 'text-blue-500'
                                      : 'text-muted-foreground'
                              }`}>
                                {isOverdue && task.status !== 'concluida' ? (
                                  <AlertTriangle className="h-5 w-5" />
                                ) : (
                                  <StatusIcon className="h-5 w-5" />
                                )}
                              </div>

                              {/* Task Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground font-mono">
                                    #{task.task_definition?.task_number}
                                  </span>
                                  <span className={`font-medium ${task.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                                    {task.task_definition?.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Euro className="h-3 w-3" />
                                    Preçário
                                  </Badge>
                                </div>
                                {task.task_definition?.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {task.task_definition.description}
                                  </p>
                                )}
                              </div>

                              {/* Deadline with reschedule button */}
                              <div className="flex items-center gap-1 shrink-0">
                                {task.deadline_at && (
                                  <div className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                                    {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                                    {formatDate(task.deadline_at)}
                                  </div>
                                )}
                                {task.status !== 'concluida' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openRescheduleDialog(task)
                                    }}
                                    title="Reagendar prazo"
                                  >
                                    <CalendarClock className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>

                              {/* Status Badge */}
                              <Badge
                                variant={
                                  task.status === 'concluida'
                                    ? 'success'
                                    : task.status === 'em_curso'
                                      ? 'info'
                                      : 'secondary'
                                }
                                className="shrink-0"
                              >
                                {statusLabels[task.status as keyof typeof statusLabels] || task.status}
                              </Badge>

                              {/* Actions */}
                              <div className="flex gap-1 shrink-0">
                                {/* Email button */}
                                {task.task_definition?.email_template_id && providerId && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSendEmail(task)
                                    }}
                                    disabled={emailPendingTaskId === task.id}
                                    title="Enviar email"
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    {emailPendingTaskId === task.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Mail className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                {task.status === 'por_fazer' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(task.id, 'em_curso', task.task_definition?.name)
                                    }}
                                    disabled={pendingTaskIds.has(task.id)}
                                    title="Iniciar tarefa"
                                  >
                                    {pendingTaskIds.has(task.id) ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                {task.status === 'em_curso' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(task.id, 'concluida', task.task_definition?.name)
                                    }}
                                    disabled={pendingTaskIds.has(task.id)}
                                    title="Marcar como concluida"
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    {pendingTaskIds.has(task.id) ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                {task.status === 'concluida' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(task.id, 'em_curso', task.task_definition?.name)
                                    }}
                                    disabled={pendingTaskIds.has(task.id)}
                                    title="Reabrir tarefa"
                                  >
                                    {pendingTaskIds.has(task.id) ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                {/* Expand/Collapse button for pricing */}
                                <CollapsibleTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title={isPricingExpanded ? 'Recolher preçário' : 'Expandir preçário'}
                                  >
                                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isPricingExpanded ? 'rotate-180' : ''}`} />
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                            </div>

                            {/* Expandable Pricing Content - always white background */}
                            <CollapsibleContent>
                              <div className="border-t px-3 py-4 bg-white dark:bg-card rounded-b-lg">
                                <TaskPricingPanel
                                  providerId={providerId!}
                                  providerName={providerName || ''}
                                  clusters={pricingData.clusters}
                                  providerServices={pricingData.providerServices}
                                />
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      )
                    }

                    // Regular task (non-expandable)
                    return (
                      <div
                        key={task.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                          task.status === 'concluida'
                            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
                            : isOverdue
                              ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                              : task.status === 'em_curso'
                                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
                                : 'bg-card'
                        }`}
                      >
                        {/* Status Icon */}
                        <div className={`shrink-0 ${
                          task.status === 'concluida'
                            ? 'text-green-500'
                            : isOverdue
                              ? 'text-red-500'
                              : task.status === 'em_curso'
                                ? 'text-blue-500'
                                : 'text-muted-foreground'
                        }`}>
                          {isOverdue && task.status !== 'concluida' ? (
                            <AlertTriangle className="h-5 w-5" />
                          ) : (
                            <StatusIcon className="h-5 w-5" />
                          )}
                        </div>

                        {/* Task Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              #{task.task_definition?.task_number}
                            </span>
                            <span className={`font-medium ${task.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.task_definition?.name}
                            </span>
                          </div>
                          {task.task_definition?.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {task.task_definition.description}
                            </p>
                          )}
                        </div>

                        {/* Deadline with reschedule button */}
                        <div className="flex items-center gap-1 shrink-0">
                          {task.deadline_at && (
                            <div className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                              {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                              {formatDate(task.deadline_at)}
                            </div>
                          )}
                          {task.status !== 'concluida' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => openRescheduleDialog(task)}
                              title="Reagendar prazo"
                            >
                              <CalendarClock className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        {/* Status Badge */}
                        <Badge
                          variant={
                            task.status === 'concluida'
                              ? 'success'
                              : task.status === 'em_curso'
                                ? 'info'
                                : 'secondary'
                          }
                          className="shrink-0"
                        >
                          {statusLabels[task.status as keyof typeof statusLabels] || task.status}
                        </Badge>

                        {/* Actions */}
                        <div className="flex gap-1 shrink-0">
                          {/* Email button - only show if task has email template configured */}
                          {task.task_definition?.email_template_id && providerId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSendEmail(task)}
                              disabled={emailPendingTaskId === task.id}
                              title="Enviar email"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {emailPendingTaskId === task.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {task.status === 'por_fazer' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(task.id, 'em_curso', task.task_definition?.name)}
                              disabled={pendingTaskIds.has(task.id)}
                              title="Iniciar tarefa"
                            >
                              {pendingTaskIds.has(task.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {task.status === 'em_curso' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(task.id, 'concluida', task.task_definition?.name)}
                              disabled={pendingTaskIds.has(task.id)}
                              title="Marcar como concluida"
                              className="text-green-600 hover:text-green-700"
                            >
                              {pendingTaskIds.has(task.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {task.status === 'concluida' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(task.id, 'em_curso', task.task_definition?.name)}
                              disabled={pendingTaskIds.has(task.id)}
                              title="Reabrir tarefa"
                            >
                              {pendingTaskIds.has(task.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar Prazo</DialogTitle>
            <DialogDescription>
              Tarefa: {selectedTask?.task_definition?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newDeadline">Novo Prazo</Label>
              <Input
                id="newDeadline"
                type="datetime-local"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo do Reagendamento (opcional)</Label>
              <Textarea
                id="reason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Ex: Aguardar resposta do prestador..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReschedule} disabled={isPending || !newDeadline}>
              {isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
