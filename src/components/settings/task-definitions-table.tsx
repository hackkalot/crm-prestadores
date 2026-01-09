'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Pencil, Check, X, Clock, Bell } from 'lucide-react'
import { updateTaskDefinition, type TaskDefinitionWithStage } from '@/lib/settings/actions'
import { toast } from 'sonner'

interface TaskDefinitionsTableProps {
  tasks: TaskDefinitionWithStage[]
  users: { id: string; name: string; email: string }[]
}

export function TaskDefinitionsTable({ tasks, users }: TaskDefinitionsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    normal: string
    urgent: string
    alert: string
  }>({ normal: '', urgent: '', alert: '' })

  const startEditing = (task: TaskDefinitionWithStage) => {
    setEditingId(task.id)
    setEditValues({
      normal: task.default_deadline_hours_normal?.toString() || '',
      urgent: task.default_deadline_hours_urgent?.toString() || '',
      alert: task.alert_hours_before?.toString() || '24',
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditValues({ normal: '', urgent: '', alert: '' })
  }

  const saveEditing = async () => {
    if (!editingId) return

    try {
      await updateTaskDefinition(editingId, {
        default_deadline_hours_normal: editValues.normal ? parseInt(editValues.normal) : null,
        default_deadline_hours_urgent: editValues.urgent ? parseInt(editValues.urgent) : null,
        alert_hours_before: editValues.alert ? parseInt(editValues.alert) : 24,
      })
      toast.success('Tarefa atualizada com sucesso')
      cancelEditing()
    } catch {
      toast.error('Erro ao atualizar tarefa')
    }
  }

  const formatHours = (hours: number | null) => {
    if (!hours) return '-'
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) return `${days}d`
    return `${days}d ${remainingHours}h`
  }

  // Agrupar tarefas por etapa
  const tasksByStage = tasks.reduce((acc, task) => {
    const stageKey = task.stage?.id || 'unknown'
    if (!acc[stageKey]) {
      acc[stageKey] = {
        stage: task.stage,
        tasks: [],
      }
    }
    acc[stageKey].tasks.push(task)
    return acc
  }, {} as Record<string, { stage: TaskDefinitionWithStage['stage']; tasks: TaskDefinitionWithStage[] }>)

  return (
    <div className="space-y-6">
      {Object.values(tasksByStage).map(({ stage, tasks: stageTasks }) => (
        <div key={stage?.id || 'unknown'} className="rounded-lg border">
          <div className="bg-muted/50 px-4 py-2 border-b">
            <h3 className="font-medium">
              Etapa {stage?.stage_number} - {stage?.name}
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead className="w-[100px]">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Normal
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Urgente
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">
                  <div className="flex items-center gap-1">
                    <Bell className="h-4 w-4" />
                    Alerta
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stageTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Badge variant="outline">{task.task_number}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.name}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingId === task.id ? (
                      <Input
                        type="number"
                        value={editValues.normal}
                        onChange={(e) => setEditValues({ ...editValues, normal: e.target.value })}
                        placeholder="horas"
                        className="w-20 h-8"
                      />
                    ) : (
                      formatHours(task.default_deadline_hours_normal)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === task.id ? (
                      <Input
                        type="number"
                        value={editValues.urgent}
                        onChange={(e) => setEditValues({ ...editValues, urgent: e.target.value })}
                        placeholder="horas"
                        className="w-20 h-8"
                      />
                    ) : (
                      formatHours(task.default_deadline_hours_urgent)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === task.id ? (
                      <Input
                        type="number"
                        value={editValues.alert}
                        onChange={(e) => setEditValues({ ...editValues, alert: e.target.value })}
                        placeholder="horas"
                        className="w-20 h-8"
                      />
                    ) : (
                      formatHours(task.alert_hours_before)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === task.id ? (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEditing}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditing}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startEditing(task)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  )
}
