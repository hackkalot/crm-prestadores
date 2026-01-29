'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { fuzzyMatch, normalizeText } from '@/hooks/use-fuzzy-search'
import { formatDateTime } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  MapPin,
  ExternalLink,
  Star,
  MessageSquare,
} from 'lucide-react'
import type {
  PaginatedSubmissions,
  AggregatedSubmission,
  ServiceDetail,
} from '@/lib/onboarding/submissoes-actions'

interface SubmissoesClientViewProps {
  initialData: PaginatedSubmissions
  servicesMap: Record<string, ServiceDetail>
}

const statusOptions = [
  { value: 'all', label: 'Todos os estados' },
  { value: 'novo', label: 'Novo' },
  { value: 'em_onboarding', label: 'Em Onboarding' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'abandonado', label: 'Abandonado' },
]

const statusVariants: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'
> = {
  novo: 'info',
  em_onboarding: 'warning',
  ativo: 'success',
  suspenso: 'secondary',
  abandonado: 'destructive',
}

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  em_onboarding: 'Em Onboarding',
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  abandonado: 'Abandonado',
}

// Day labels for display
const dayLabels: Record<string, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom',
}

// Column definitions
const columns = [
  {
    key: 'provider_name',
    label: 'Prestador',
    width: 200,
    clickable: true,
  },
  {
    key: 'provider_status',
    label: 'Estado',
    width: 120,
    clickable: false,
  },
  {
    key: 'submission_number',
    label: '#',
    width: 50,
    clickable: false,
  },
  {
    key: 'submitted_at',
    label: 'Data Submissão',
    width: 160,
    clickable: false,
  },
  {
    key: 'submitted_ip',
    label: 'IP',
    width: 120,
    clickable: false,
  },
  {
    key: 'has_activity_declaration',
    label: 'Decl. Atividade',
    width: 120,
    clickable: false,
  },
  {
    key: 'has_liability_insurance',
    label: 'Seguro RC',
    width: 100,
    clickable: false,
  },
  {
    key: 'has_work_accidents_insurance',
    label: 'Seguro AT',
    width: 100,
    clickable: false,
  },
  {
    key: 'certifications',
    label: 'Certificações',
    width: 200,
    clickable: false,
  },
  {
    key: 'works_with_platforms',
    label: 'Plataformas',
    width: 200,
    clickable: false,
  },
  {
    key: 'available_weekdays',
    label: 'Dias Disponíveis',
    width: 200,
    clickable: false,
  },
  {
    key: 'work_hours_start',
    label: 'Hora Início',
    width: 90,
    clickable: false,
  },
  {
    key: 'work_hours_end',
    label: 'Hora Fim',
    width: 90,
    clickable: false,
  },
  {
    key: 'num_technicians',
    label: 'Nº Técnicos',
    width: 100,
    clickable: false,
  },
  {
    key: 'has_transport',
    label: 'Viatura',
    width: 80,
    clickable: false,
  },
  {
    key: 'has_computer',
    label: 'PC/Tablet',
    width: 80,
    clickable: false,
  },
  {
    key: 'own_equipment',
    label: 'Equipamento Próprio',
    width: 250,
    clickable: false,
  },
  {
    key: 'selected_services',
    label: 'Serviços',
    width: 120,
    clickable: true,
  },
  {
    key: 'coverage_municipalities',
    label: 'Cobertura',
    width: 120,
    clickable: true,
  },
  {
    key: 'feedback',
    label: 'Feedback',
    width: 150,
    clickable: true,
  },
]

export function SubmissoesClientView({
  initialData,
  servicesMap,
}: SubmissoesClientViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Local state
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    Object.fromEntries(columns.map((col) => [col.key, col.width]))
  )
  const [resizing, setResizing] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState<'services' | 'coverage' | 'feedback' | null>(null)
  const [selectedSubmission, setSelectedSubmission] =
    useState<AggregatedSubmission | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  // Get URL-based filters
  const currentStatus = searchParams.get('providerStatus') || 'all'
  const currentDateFrom = searchParams.get('dateFrom') || ''
  const currentDateTo = searchParams.get('dateTo') || ''

  // Apply client-side fuzzy search filtering
  const filteredData = useMemo(() => {
    let data = initialData.data

    // Filter by provider status if not from URL (URL already filters on server)
    if (currentStatus !== 'all') {
      data = data.filter((s) => s.provider_status === currentStatus)
    }

    if (!searchQuery.trim()) {
      return data
    }

    const query = searchQuery.trim()

    return data.filter((submission) => {
      // Check provider name
      if (fuzzyMatch(submission.provider_name || '', query, 75)) return true

      // Check provider email
      if (
        submission.provider_email &&
        normalizeText(submission.provider_email).includes(normalizeText(query))
      )
        return true

      // Check IP
      if (submission.submitted_ip && submission.submitted_ip.includes(query))
        return true

      return false
    })
  }, [initialData.data, searchQuery, currentStatus])

  // Client-side pagination
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const totalFiltered = filteredData.length
  const totalPages = Math.ceil(totalFiltered / limit)
  const paginatedData = filteredData.slice((page - 1) * limit, page * limit)

  // URL update helpers
  const updateUrlParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`/onboarding/submissoes?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/onboarding/submissoes?${params.toString()}`)
  }

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', newLimit)
    params.set('page', '1')
    router.push(`/onboarding/submissoes?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearchQuery('')
    router.push('/onboarding/submissoes')
  }

  const hasFilters =
    currentStatus !== 'all' || currentDateFrom || currentDateTo || searchQuery

  const hasAdvancedFilters = currentDateFrom || currentDateTo

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
      setColumnWidths((prev) => ({ ...prev, [resizing]: newWidth }))
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
        behavior: 'smooth',
      })
    }
  }

  // Handle cell click
  const handleCellClick = (columnKey: string, submission: AggregatedSubmission) => {
    if (
      columnKey === 'selected_services' &&
      submission.selected_services?.length
    ) {
      setSelectedSubmission(submission)
      setDialogOpen('services')
    } else if (
      columnKey === 'coverage_municipalities' &&
      submission.coverage_municipalities?.length
    ) {
      setSelectedSubmission(submission)
      setDialogOpen('coverage')
    } else if (
      columnKey === 'feedback' &&
      submission.feedback &&
      !submission.feedback.skipped
    ) {
      setSelectedSubmission(submission)
      setDialogOpen('feedback')
    }
  }

  // Render cell content
  const renderCell = (columnKey: string, submission: AggregatedSubmission) => {
    switch (columnKey) {
      case 'provider_name':
        return (
          <Link
            href={`/providers/${submission.provider_id}?tab=submissoes`}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            {submission.provider_name}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )
      case 'provider_status':
        return (
          <Badge
            variant={statusVariants[submission.provider_status] || 'default'}
          >
            {statusLabels[submission.provider_status] || submission.provider_status}
          </Badge>
        )
      case 'submission_number':
        return submission.submission_number?.toString() || '1'
      case 'submitted_at':
        return submission.submitted_at
          ? formatDateTime(submission.submitted_at)
          : '-'
      case 'submitted_ip':
        return submission.submitted_ip || '-'
      case 'has_activity_declaration':
        return submission.has_activity_declaration ? 'Sim' : 'Não'
      case 'has_liability_insurance':
        return submission.has_liability_insurance ? 'Sim' : 'Não'
      case 'has_work_accidents_insurance':
        return submission.has_work_accidents_insurance ? 'Sim' : 'Não'
      case 'certifications':
        return submission.certifications?.length
          ? submission.certifications.join(', ')
          : '-'
      case 'works_with_platforms':
        return submission.works_with_platforms?.length
          ? submission.works_with_platforms.join(', ')
          : '-'
      case 'available_weekdays':
        return submission.available_weekdays?.length
          ? submission.available_weekdays.map((d) => dayLabels[d] || d).join(', ')
          : '-'
      case 'work_hours_start':
        return submission.work_hours_start || '-'
      case 'work_hours_end':
        return submission.work_hours_end || '-'
      case 'num_technicians':
        return submission.num_technicians?.toString() || '-'
      case 'has_transport':
        return submission.has_transport ? 'Sim' : 'Não'
      case 'has_computer':
        return submission.has_computer ? 'Sim' : 'Não'
      case 'own_equipment':
        return submission.own_equipment?.length
          ? submission.own_equipment.join(', ')
          : '-'
      case 'selected_services':
        return `${submission.selected_services?.length || 0} selecionados`
      case 'coverage_municipalities':
        return `${submission.coverage_municipalities?.length || 0} concelhos`
      case 'feedback': {
        if (!submission.feedback || submission.feedback.skipped) return '-'
        const parts: string[] = []
        if (submission.feedback.nps_score !== undefined) {
          parts.push(`NPS: ${submission.feedback.nps_score}`)
        }
        if (submission.feedback.ratings) {
          const avg = Math.round(
            ((submission.feedback.ratings.ease_of_use || 0) +
              (submission.feedback.ratings.clarity || 0) +
              (submission.feedback.ratings.time_spent || 0)) / 3
          )
          if (avg > 0) parts.push(`${avg}★`)
        }
        return parts.length > 0 ? parts.join(' | ') : '-'
      }
      default:
        return '-'
    }
  }

  const totalWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0)

  // Group services by cluster and group for the selected submission
  const getGroupedServices = (submission: AggregatedSubmission | null) => {
    if (!submission?.selected_services?.length) return {}

    const grouped: Record<string, Record<string, ServiceDetail[]>> = {}

    submission.selected_services.forEach((serviceId) => {
      const service = servicesMap[serviceId]
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
    <>
      <div className="space-y-6">
        {/* Filters Section */}
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por prestador, email ou IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {filteredData.length} resultados
                </span>
              )}
            </div>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Estado do Prestador:
              </span>
              <Select
                value={currentStatus}
                onValueChange={(value) => updateUrlParam('providerStatus', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={hasAdvancedFilters ? 'border-primary text-primary' : ''}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtros avançados
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
              {hasAdvancedFilters && (
                <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>

            {/* Scroll controls */}
            <div className="flex items-center gap-1 ml-auto">
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

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data de submissão (desde)</label>
                <DatePicker
                  value={currentDateFrom ? parseISO(currentDateFrom) : null}
                  onChange={(date) =>
                    updateUrlParam('dateFrom', date ? format(date, 'yyyy-MM-dd') : '')
                  }
                  placeholder="Selecionar data"
                  toDate={currentDateTo ? parseISO(currentDateTo) : undefined}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data de submissão (até)</label>
                <DatePicker
                  value={currentDateTo ? parseISO(currentDateTo) : null}
                  onChange={(date) =>
                    updateUrlParam('dateTo', date ? format(date, 'yyyy-MM-dd') : '')
                  }
                  placeholder="Selecionar data"
                  fromDate={currentDateFrom ? parseISO(currentDateFrom) : undefined}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {/* Pagination Controls - Top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                A mostrar{' '}
                <span className="font-medium text-foreground">
                  {paginatedData.length}
                </span>{' '}
                de{' '}
                <span className="font-medium text-foreground">{totalFiltered}</span>{' '}
                submissões
                {searchQuery && (
                  <span className="text-primary">
                    {' '}
                    (filtradas de {initialData.total})
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Por página:</span>
                <Select value={limit.toString()} onValueChange={handleLimitChange}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{page}</span> de{' '}
                <span className="font-medium text-foreground">{totalPages || 1}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Seguinte
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Empty State */}
          {paginatedData.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? `Nenhuma submissão encontrada para "${searchQuery}"`
                    : 'Nenhuma submissão encontrada'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          {paginatedData.length > 0 && (
            <Card className="overflow-hidden">
              <div
                ref={tableRef}
                className="overflow-x-auto"
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
                    {paginatedData.map((submission) => (
                      <tr
                        key={submission.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {columns.map((col, idx) => {
                          const isClickable =
                            (col.key === 'selected_services' &&
                              submission.selected_services?.length) ||
                            (col.key === 'coverage_municipalities' &&
                              submission.coverage_municipalities?.length) ||
                            (col.key === 'feedback' &&
                              submission.feedback &&
                              !submission.feedback.skipped)
                          return (
                            <td
                              key={col.key}
                              className={`px-3 py-2.5 text-sm border-b ${
                                idx < columns.length - 1
                                  ? 'border-r border-border/30'
                                  : ''
                              } ${
                                isClickable
                                  ? 'cursor-pointer hover:bg-primary/10'
                                  : ''
                              }`}
                              style={{
                                width: columnWidths[col.key],
                                minWidth: 60,
                                maxWidth: columnWidths[col.key],
                              }}
                              onClick={() =>
                                isClickable && handleCellClick(col.key, submission)
                              }
                            >
                              <div
                                className={`overflow-hidden text-ellipsis whitespace-nowrap ${
                                  isClickable
                                    ? 'text-primary underline underline-offset-2'
                                    : ''
                                }`}
                                title={
                                  isClickable
                                    ? 'Clique para ver detalhes'
                                    : undefined
                                }
                              >
                                {renderCell(col.key, submission)}
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
                Arraste as bordas das colunas para redimensionar. Clique nos campos
                sublinhados para ver detalhes.
              </div>
            </Card>
          )}

          {/* Pagination Controls - Bottom */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{page}</span> de{' '}
                <span className="font-medium text-foreground">{totalPages}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Seguinte
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog para Serviços */}
      <Dialog
        open={dialogOpen === 'services'}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(null)
            setSelectedSubmission(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Serviços Selecionados (
              {selectedSubmission?.selected_services?.length || 0})
              {selectedSubmission && (
                <Badge variant="outline" className="ml-2">
                  {selectedSubmission.provider_name} - Submissão #
                  {selectedSubmission.submission_number || 1}
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
                          <Badge variant="secondary" className="text-xs">
                            {group}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {services.length}{' '}
                            {services.length === 1 ? 'serviço' : 'serviços'}
                          </span>
                        </div>
                        <ul className="pl-4 space-y-0.5">
                          {services.map((service) => (
                            <li
                              key={service.id}
                              className="text-sm flex items-start gap-2"
                            >
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
      <Dialog
        open={dialogOpen === 'coverage'}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(null)
            setSelectedSubmission(null)
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Cobertura Geográfica (
              {selectedSubmission?.coverage_municipalities?.length || 0} concelhos)
              {selectedSubmission && (
                <Badge variant="outline" className="ml-2">
                  {selectedSubmission.provider_name} - Submissão #
                  {selectedSubmission.submission_number || 1}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedSubmission?.coverage_municipalities?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {[...selectedSubmission.coverage_municipalities]
                  .sort()
                  .map((municipality) => (
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
      <Dialog
        open={dialogOpen === 'feedback'}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(null)
            setSelectedSubmission(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback do Prestador
              {selectedSubmission && (
                <Badge variant="outline" className="ml-2">
                  {selectedSubmission.provider_name} - #{selectedSubmission.submission_number || 1}
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
    </>
  )
}
