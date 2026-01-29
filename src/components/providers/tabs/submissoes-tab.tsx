'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDateTime } from '@/lib/utils'
import { Link2, Copy, ChevronLeft, ChevronRight, Briefcase, MapPin, Star, MessageSquare } from 'lucide-react'
import type { ProviderFeedback } from '@/lib/forms/services-actions'
import { generateFormsToken } from '@/lib/forms/services-actions'
import { toast } from 'sonner'

// Type for a single submission
interface FormSubmission {
  id: string
  submission_number: number | null
  has_activity_declaration: boolean | null
  has_liability_insurance: boolean | null
  has_work_accidents_insurance: boolean | null
  certifications: string[] | null
  works_with_platforms: string[] | null
  available_weekdays: string[] | null
  work_hours_start: string | null
  work_hours_end: string | null
  num_technicians: number | null
  has_transport: boolean | null
  has_computer: boolean | null
  own_equipment: string[] | null
  selected_services: string[] | null
  coverage_municipalities: string[] | null
  submitted_at: string | null
  submitted_ip: string | null
  feedback?: ProviderFeedback | null
}

// Type for service details
interface ServiceDetail {
  id: string
  service_name: string
  cluster: string
  service_group: string
  unit_description?: string | null
  typology?: string | null
}

interface SubmissoesTabProps {
  provider: {
    id: string
    name: string
    status: string
    first_application_at?: string | null
    created_at: string
    onboarding_started_at?: string | null
    activated_at?: string | null
    abandoned_at?: string | null
    abandonment_reason?: string | null
    abandonment_party?: string | null
    abandonment_notes?: string | null
    application_source?: string | null
    forms_submitted_at?: string | null
  }
  applicationHistory: Array<{
    id: string
    applied_at: string
    source?: string | null
  }>
  // New: array of all submissions
  submissions: FormSubmission[]
  // New: map of service ID -> service details
  allServicesMap: Record<string, ServiceDetail>
}

// Day labels for display
const dayLabels: Record<string, string> = {
  monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua',
  thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom'
}

// Column definitions with headers and accessor functions
const columns = [
  {
    key: 'submission_number',
    label: '#',
    width: 50,
    clickable: false,
    render: (data: FormSubmission) => data.submission_number?.toString() || '1'
  },
  {
    key: 'submitted_at',
    label: 'Data Submissão',
    width: 160,
    clickable: false,
    render: (data: FormSubmission) => data.submitted_at ? formatDateTime(data.submitted_at) : '-'
  },
  {
    key: 'submitted_ip',
    label: 'IP',
    width: 120,
    clickable: false,
    render: (data: FormSubmission) => data.submitted_ip || '-'
  },
  {
    key: 'has_activity_declaration',
    label: 'Decl. Atividade',
    width: 120,
    clickable: false,
    render: (data: FormSubmission) => data.has_activity_declaration ? 'Sim' : 'Não'
  },
  {
    key: 'has_liability_insurance',
    label: 'Seguro RC',
    width: 100,
    clickable: false,
    render: (data: FormSubmission) => data.has_liability_insurance ? 'Sim' : 'Não'
  },
  {
    key: 'has_work_accidents_insurance',
    label: 'Seguro AT',
    width: 100,
    clickable: false,
    render: (data: FormSubmission) => data.has_work_accidents_insurance ? 'Sim' : 'Não'
  },
  {
    key: 'certifications',
    label: 'Certificações',
    width: 200,
    clickable: false,
    render: (data: FormSubmission) => data.certifications?.length ? data.certifications.join(', ') : '-'
  },
  {
    key: 'works_with_platforms',
    label: 'Plataformas',
    width: 200,
    clickable: false,
    render: (data: FormSubmission) => data.works_with_platforms?.length ? data.works_with_platforms.join(', ') : '-'
  },
  {
    key: 'available_weekdays',
    label: 'Dias Disponíveis',
    width: 200,
    clickable: false,
    render: (data: FormSubmission) => {
      return data.available_weekdays?.length
        ? data.available_weekdays.map(d => dayLabels[d] || d).join(', ')
        : '-'
    }
  },
  {
    key: 'work_hours_start',
    label: 'Hora Início',
    width: 90,
    clickable: false,
    render: (data: FormSubmission) => data.work_hours_start || '-'
  },
  {
    key: 'work_hours_end',
    label: 'Hora Fim',
    width: 90,
    clickable: false,
    render: (data: FormSubmission) => data.work_hours_end || '-'
  },
  {
    key: 'num_technicians',
    label: 'Nº Técnicos',
    width: 100,
    clickable: false,
    render: (data: FormSubmission) => data.num_technicians?.toString() || '-'
  },
  {
    key: 'has_transport',
    label: 'Viatura',
    width: 80,
    clickable: false,
    render: (data: FormSubmission) => data.has_transport ? 'Sim' : 'Não'
  },
  {
    key: 'has_computer',
    label: 'PC/Tablet',
    width: 80,
    clickable: false,
    render: (data: FormSubmission) => data.has_computer ? 'Sim' : 'Não'
  },
  {
    key: 'own_equipment',
    label: 'Equipamento Próprio',
    width: 250,
    clickable: false,
    render: (data: FormSubmission) => data.own_equipment?.length ? data.own_equipment.join(', ') : '-'
  },
  {
    key: 'selected_services',
    label: 'Serviços',
    width: 120,
    clickable: true,
    render: (data: FormSubmission) => `${data.selected_services?.length || 0} selecionados`
  },
  {
    key: 'coverage_municipalities',
    label: 'Cobertura',
    width: 120,
    clickable: true,
    render: (data: FormSubmission) => `${data.coverage_municipalities?.length || 0} concelhos`
  },
  {
    key: 'feedback',
    label: 'Feedback',
    width: 150,
    clickable: true,
    render: (data: FormSubmission) => {
      if (!data.feedback || data.feedback.skipped) return '-'
      const parts: string[] = []
      if (data.feedback.nps_score !== undefined) {
        parts.push(`NPS: ${data.feedback.nps_score}`)
      }
      if (data.feedback.ratings) {
        const avg = Math.round(
          ((data.feedback.ratings.ease_of_use || 0) +
            (data.feedback.ratings.clarity || 0) +
            (data.feedback.ratings.time_spent || 0)) / 3
        )
        if (avg > 0) parts.push(`${avg}★`)
      }
      return parts.length > 0 ? parts.join(' | ') : '-'
    }
  },
]

export function SubmissoesTab({ provider, submissions, allServicesMap }: SubmissoesTabProps) {
  const [isPending, startTransition] = useTransition()
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    Object.fromEntries(columns.map(col => [col.key, col.width]))
  )
  const [resizing, setResizing] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState<'services' | 'coverage' | 'feedback' | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleCopyFormsLink = async () => {
    startTransition(async () => {
      const result = await generateFormsToken(provider.id)
      if (result.success && result.token) {
        const link = `${window.location.origin}/forms/services/${result.token}`

        // Try modern clipboard API first, with fallback for when document loses focus
        try {
          await navigator.clipboard.writeText(link)
          toast.success('Link copiado para a área de transferência!')
        } catch {
          // Fallback: create a temporary textarea and use execCommand
          const textArea = document.createElement('textarea')
          textArea.value = link
          textArea.style.position = 'fixed'
          textArea.style.left = '-9999px'
          textArea.style.top = '-9999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()

          try {
            document.execCommand('copy')
            toast.success('Link copiado para a área de transferência!')
          } catch {
            // Last resort: show the link for manual copy
            toast.error('Não foi possível copiar. Link: ' + link)
          } finally {
            document.body.removeChild(textArea)
          }
        }
      } else {
        toast.error(result.error || 'Erro ao gerar link')
      }
    })
  }

  // Handle column resize
  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault()
    setResizing(columnKey)
    startXRef.current = e.clientX
    startWidthRef.current = columnWidths[columnKey]
  }

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current
      const newWidth = Math.max(60, startWidthRef.current + diff)
      setColumnWidths(prev => ({ ...prev, [resizing]: newWidth }))
    }

    const handleMouseUp = () => {
      setResizing(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing])

  // Scroll controls
  const scrollTable = (direction: 'left' | 'right') => {
    if (tableRef.current) {
      const scrollAmount = 300
      tableRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  // Handle cell click
  const handleCellClick = (columnKey: string, submission: FormSubmission) => {
    if (columnKey === 'selected_services' && submission.selected_services?.length) {
      setSelectedSubmission(submission)
      setDialogOpen('services')
    } else if (columnKey === 'coverage_municipalities' && submission.coverage_municipalities?.length) {
      setSelectedSubmission(submission)
      setDialogOpen('coverage')
    } else if (columnKey === 'feedback' && submission.feedback && !submission.feedback.skipped) {
      setSelectedSubmission(submission)
      setDialogOpen('feedback')
    }
  }

  const totalWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0)

  // Group services by cluster and group for the selected submission
  const getGroupedServices = (submission: FormSubmission | null) => {
    if (!submission?.selected_services?.length) return {}

    const grouped: Record<string, Record<string, ServiceDetail[]>> = {}

    submission.selected_services.forEach(serviceId => {
      const service = allServicesMap[serviceId]
      if (!service) return

      const cluster = service.cluster
      const group = service.service_group || 'Outros'

      if (!grouped[cluster]) grouped[cluster] = {}
      if (!grouped[cluster][group]) grouped[cluster][group] = []

      grouped[cluster][group].push(service)
    })

    return grouped
  }

  const groupedServices = getGroupedServices(selectedSubmission)

  return (
    <div className="space-y-6">
      {/* Formulário de Serviços */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Formulário de Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Enviar formulário ao prestador</p>
              <p className="text-sm text-muted-foreground">
                Gere e copie o link do formulário para enviar ao prestador
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyFormsLink}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? (
                'A gerar...'
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar Link
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Submissões */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Submissões
              {submissions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {submissions.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => scrollTable('left')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => scrollTable('right')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {submissions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              O prestador ainda não submeteu o formulário de serviços.
            </p>
          )}
        </CardHeader>
        {submissions.length > 0 && (
          <CardContent className="p-0">
            <div
              ref={tableRef}
              className="overflow-x-auto border-t"
              style={{ scrollbarWidth: 'thin' }}
            >
              <table
                className="w-max min-w-full border-collapse"
                style={{ width: totalWidth }}
              >
                <thead>
                  <tr className="bg-muted/60">
                    {columns.map((col, idx) => (
                      <th
                        key={col.key}
                        className="relative text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5 border-b border-r border-border/50 select-none whitespace-nowrap"
                        style={{ width: columnWidths[col.key], minWidth: 60 }}
                      >
                        <div className="flex items-center gap-1 pr-2">
                          <span className="truncate">{col.label}</span>
                        </div>
                        {/* Resize handle */}
                        {idx < columns.length - 1 && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center hover:bg-primary/20 group z-10"
                            onMouseDown={(e) => handleMouseDown(e, col.key)}
                          >
                            <div className="w-0.5 h-4 bg-border group-hover:bg-primary rounded-full" />
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission, rowIdx) => (
                    <tr
                      key={submission.id}
                      className={`hover:bg-muted/30 transition-colors ${rowIdx === 0 ? 'bg-primary/5' : ''}`}
                    >
                      {columns.map((col, idx) => {
                        const isClickable = col.clickable && (
                          (col.key === 'selected_services' && submission.selected_services?.length) ||
                          (col.key === 'coverage_municipalities' && submission.coverage_municipalities?.length) ||
                          (col.key === 'feedback' && submission.feedback && !submission.feedback.skipped)
                        )
                        return (
                          <td
                            key={col.key}
                            className={`px-3 py-2.5 text-sm border-b ${idx < columns.length - 1 ? 'border-r border-border/30' : ''} ${isClickable ? 'cursor-pointer hover:bg-primary/10' : ''}`}
                            style={{ width: columnWidths[col.key], minWidth: 60, maxWidth: columnWidths[col.key] }}
                            onClick={() => isClickable && handleCellClick(col.key, submission)}
                          >
                            <div
                              className={`overflow-hidden text-ellipsis whitespace-nowrap ${isClickable ? 'text-primary underline underline-offset-2' : ''}`}
                              title={isClickable ? 'Clique para ver detalhes' : col.render(submission)}
                            >
                              {col.render(submission)}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/30">
              {submissions.length === 1
                ? 'Arraste as bordas das colunas para redimensionar. Clique nos campos sublinhados para ver detalhes.'
                : `${submissions.length} submissões. A linha destacada é a mais recente. Clique nos campos sublinhados para ver detalhes.`
              }
            </div>
          </CardContent>
        )}
      </Card>

      {/* Dialog para Serviços */}
      <Dialog open={dialogOpen === 'services'} onOpenChange={(open) => {
        if (!open) {
          setDialogOpen(null)
          setSelectedSubmission(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Serviços Selecionados ({selectedSubmission?.selected_services?.length || 0})
              {selectedSubmission && (
                <Badge variant="outline" className="ml-2">
                  Submissão #{selectedSubmission.submission_number || 1}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {Object.keys(groupedServices).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupedServices).map(([cluster, groups]) => (
                  <div key={cluster} className="space-y-2">
                    <h4 className="font-medium text-sm border-b pb-1">{cluster}</h4>
                    {Object.entries(groups).map(([group, services]) => (
                      <div key={`${cluster}-${group}`} className="pl-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{group}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {services.length} {services.length === 1 ? 'serviço' : 'serviços'}
                          </span>
                        </div>
                        <ul className="pl-4 space-y-0.5">
                          {services.map((service) => (
                            <li key={service.id} className="text-sm flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              <div>
                                <span>{service.service_name}</span>
                                {service.unit_description && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({service.unit_description})
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum serviço selecionado ou detalhes não disponíveis.
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog para Cobertura */}
      <Dialog open={dialogOpen === 'coverage'} onOpenChange={(open) => {
        if (!open) {
          setDialogOpen(null)
          setSelectedSubmission(null)
        }
      }}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Cobertura Geográfica ({selectedSubmission?.coverage_municipalities?.length || 0} concelhos)
              {selectedSubmission && (
                <Badge variant="outline" className="ml-2">
                  Submissão #{selectedSubmission.submission_number || 1}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedSubmission?.coverage_municipalities?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {[...selectedSubmission.coverage_municipalities].sort().map((municipality) => (
                  <Badge key={municipality} variant="outline" className="text-xs">
                    {municipality}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum concelho selecionado.
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog para Feedback */}
      <Dialog open={dialogOpen === 'feedback'} onOpenChange={(open) => {
        if (!open) {
          setDialogOpen(null)
          setSelectedSubmission(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback do Prestador
              {selectedSubmission && (
                <Badge variant="outline" className="ml-2">
                  Submissão #{selectedSubmission.submission_number || 1}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedSubmission?.feedback && !selectedSubmission.feedback.skipped && (
            <div className="space-y-4">
              {/* NPS Score */}
              {selectedSubmission.feedback.nps_score !== undefined && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">NPS (Recomendação)</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${
                      selectedSubmission.feedback.nps_score >= 9 ? 'text-green-600' :
                      selectedSubmission.feedback.nps_score >= 7 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {selectedSubmission.feedback.nps_score}
                    </span>
                    <span className="text-sm text-muted-foreground">/ 10</span>
                    <Badge variant={
                      selectedSubmission.feedback.nps_score >= 9 ? 'success' :
                      selectedSubmission.feedback.nps_score >= 7 ? 'warning' :
                      'destructive'
                    }>
                      {selectedSubmission.feedback.nps_score >= 9 ? 'Promotor' :
                       selectedSubmission.feedback.nps_score >= 7 ? 'Neutro' : 'Detrator'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Star Ratings */}
              {selectedSubmission.feedback.ratings && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Avaliações</p>
                  <div className="space-y-1.5">
                    {selectedSubmission.feedback.ratings.ease_of_use !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Facilidade de uso</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (selectedSubmission.feedback?.ratings?.ease_of_use || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedSubmission.feedback.ratings.clarity !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Clareza das perguntas</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (selectedSubmission.feedback?.ratings?.clarity || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedSubmission.feedback.ratings.time_spent !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tempo adequado</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (selectedSubmission.feedback?.ratings?.time_spent || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Time Perception */}
              {selectedSubmission.feedback.time_perception && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Perceção de tempo</p>
                  <Badge variant="outline">
                    {selectedSubmission.feedback.time_perception === 'quick' ? 'Rápido' :
                     selectedSubmission.feedback.time_perception === 'adequate' ? 'Adequado' : 'Demorado'}
                  </Badge>
                </div>
              )}

              {/* Comment */}
              {selectedSubmission.feedback.comment && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Comentário</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    {selectedSubmission.feedback.comment}
                  </p>
                </div>
              )}

              {/* Submitted at */}
              {selectedSubmission.feedback.submitted_at && (
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Feedback enviado em {formatDateTime(selectedSubmission.feedback.submitted_at)}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
