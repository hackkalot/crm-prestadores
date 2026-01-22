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
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Check, X, Clock, Bell, Mail } from 'lucide-react'
import { updateTaskDefinition, type TaskDefinitionWithStage } from '@/lib/settings/actions'
import { toast } from 'sonner'

interface EmailTemplateOption {
  id: string
  key: string
  name: string
}

interface TaskDefinitionsTableProps {
  tasks: TaskDefinitionWithStage[]
  users: { id: string; name: string; email: string }[]
  emailTemplates?: EmailTemplateOption[]
}

export function TaskDefinitionsTable({ tasks, users, emailTemplates = [] }: TaskDefinitionsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    name: string
    description: string
    normal: string
    urgent: string
    alert: string
    emailTemplateId: string | null
  }>({ name: '', description: '', normal: '', urgent: '', alert: '', emailTemplateId: null })

  const startEditing = (task: TaskDefinitionWithStage) => {
    setEditingId(task.id)
    setEditValues({
      name: task.name,
      description: task.description || '',
      normal: task.default_deadline_hours_normal?.toString() || '',
      urgent: task.default_deadline_hours_urgent?.toString() || '',
      alert: task.alert_hours_before?.toString() || '24',
      emailTemplateId: task.email_template_id || null,
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditValues({ name: '', description: '', normal: '', urgent: '', alert: '', emailTemplateId: null })
  }

  const saveEditing = async () => {
    if (!editingId) return

    try {
      await updateTaskDefinition(editingId, {
        name: editValues.name.trim() || undefined,
        description: editValues.description.trim() || null,
        default_deadline_hours_normal: editValues.normal ? parseInt(editValues.normal) : null,
        default_deadline_hours_urgent: editValues.urgent ? parseInt(editValues.urgent) : null,
        alert_hours_before: editValues.alert ? parseInt(editValues.alert) : 24,
        email_template_id: editValues.emailTemplateId,
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
                <TableHead className="w-[180px]">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email Template
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
                    {editingId === task.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editValues.name}
                          onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                          placeholder="Nome da tarefa"
                          className="h-8"
                        />
                        <Input
                          value={editValues.description}
                          onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                          placeholder="Descrição (opcional)"
                          className="h-8 text-sm"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">{task.name}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {task.description}
                          </p>
                        )}
                      </div>
                    )}
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
                      <Select
                        value={editValues.emailTemplateId || 'none'}
                        onValueChange={(value) => setEditValues({ ...editValues, emailTemplateId: value === 'none' ? null : value })}
                      >
                        <SelectTrigger className="h-8 w-40">
                          <span className="truncate">
                            {editValues.emailTemplateId
                              ? emailTemplates.find(t => t.id === editValues.emailTemplateId)?.name || 'Selecionar...'
                              : 'Nenhum'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {emailTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      task.email_template ? (
                        <Badge variant="secondary" className="font-normal">
                          {task.email_template.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )
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
