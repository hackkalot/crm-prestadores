'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  Target,
  Calendar,
  User as UserIcon,
  XCircle,
  Filter,
  X as XIcon,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { calculateProgressPercentage } from '@/lib/priorities/utils'
import {
  PRIORITY_TYPE_LABELS,
  PRIORITY_URGENCY_LABELS,
  PRIORITY_STATUS_LABELS,
  PRIORITY_URGENCY_VARIANTS,
  PRIORITY_STATUS_VARIANTS,
  type PriorityWithAssignments,
  type PriorityType,
  type PriorityUrgency,
  type PriorityStatus,
} from '@/types/priorities'
import { cancelPriority, deletePriority } from '@/lib/priorities/actions'
import { useTransition } from 'react'
import { UpdateProgressDialog } from './update-progress-dialog'

interface PriorityListAdminProps {
  priorities: PriorityWithAssignments[]
}

export function PriorityListAdmin({ priorities }: PriorityListAdminProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all')
  const [isPending, startTransition] = useTransition()

  // Filter priorities
  const filteredPriorities = useMemo(() => {
    return priorities.filter((priority) => {
      if (typeFilter !== 'all' && priority.type !== typeFilter) return false
      if (statusFilter !== 'all' && priority.status !== statusFilter)
        return false
      if (urgencyFilter !== 'all' && priority.urgency !== urgencyFilter)
        return false
      return true
    })
  }, [priorities, typeFilter, statusFilter, urgencyFilter])

  const hasFilters =
    typeFilter !== 'all' || statusFilter !== 'all' || urgencyFilter !== 'all'

  const clearFilters = () => {
    setTypeFilter('all')
    setStatusFilter('all')
    setUrgencyFilter('all')
  }

  const handleCancel = (priorityId: string) => {
    if (!confirm('Tem a certeza que deseja cancelar esta prioridade?')) return

    startTransition(async () => {
      await cancelPriority(priorityId)
    })
  }

  const handleDelete = (priorityId: string) => {
    if (!confirm('Tem a certeza que deseja remover esta prioridade?')) return

    startTransition(async () => {
      await deletePriority(priorityId)
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Todas as Prioridades ({filteredPriorities.length}
            {priorities.length !== filteredPriorities.length &&
              ` de ${priorities.length}`}
            )
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 gap-1"
              >
                <XIcon className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {Object.entries(PRIORITY_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(PRIORITY_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="Urgência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(PRIORITY_URGENCY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredPriorities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              {hasFilters
                ? 'Nenhuma prioridade encontrada com os filtros selecionados.'
                : 'Ainda não foram criadas prioridades.'}
            </p>
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Atribuído a</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPriorities.map((priority) => {
                  const progress = calculateProgressPercentage(
                    priority.current_value,
                    priority.target_value
                  )

                  return (
                    <TableRow key={priority.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{priority.title}</p>
                          {priority.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {priority.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {PRIORITY_TYPE_LABELS[priority.type]}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1 min-w-[150px]">
                          <div className="flex items-center justify-between text-xs">
                            <span>
                              {priority.current_value} / {priority.target_value}{' '}
                              {priority.unit}
                            </span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            PRIORITY_STATUS_VARIANTS[priority.status] as 'info' | 'success' | 'secondary'
                          }
                        >
                          {PRIORITY_STATUS_LABELS[priority.status]}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            PRIORITY_URGENCY_VARIANTS[priority.urgency] as 'secondary' | 'default' | 'warning' | 'destructive'
                          }
                        >
                          {PRIORITY_URGENCY_LABELS[priority.urgency]}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {priority.deadline ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDateTime(priority.deadline)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Sem prazo
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {priority.assignments && priority.assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {priority.assignments.slice(0, 2).map((assignment) => (
                              <Badge
                                key={assignment.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {assignment.user?.name}
                              </Badge>
                            ))}
                            {priority.assignments.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{priority.assignments.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Não atribuído
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {priority.status === 'ativa' && (
                            <>
                              <UpdateProgressDialog priority={priority} />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(priority.id)}
                                disabled={isPending}
                                className="h-8"
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(priority.id)}
                            disabled={isPending}
                            className="h-8 text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
