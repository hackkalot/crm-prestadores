'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { CoverageFilter } from '@/components/ui/coverage-filter'
import { DatePicker } from '@/components/ui/date-picker'
import { ProviderLink } from '@/components/ui/provider-link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CandidaturaCard } from './candidatura-card'
import { SendToOnboardingDialog } from './send-to-onboarding-dialog'
import { AbandonDialog } from './abandon-dialog'
import { fuzzyMatch, normalizeText } from '@/hooks/use-fuzzy-search'
import { formatDate } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  List,
  LayoutGrid,
  Users,
  User,
  Briefcase,
  Building2,
  MapPin,
  Send,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react'
import type { PaginatedCandidaturas } from '@/lib/candidaturas/actions'

// SWR fetcher for API route
const fetcher = (url: string) => fetch(url).then(res => res.json())

interface CandidaturasClientViewProps {
  initialData: PaginatedCandidaturas
  services: string[]
}

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'novo', label: 'Novos' },
  { value: 'em_onboarding', label: 'Em Onboarding' },
  { value: 'on_hold', label: 'On-Hold' },
  { value: 'abandonado', label: 'Abandonados' },
]

const entityOptions = [
  { value: '_all', label: 'Todos os tipos' },
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'eni', label: 'ENI' },
  { value: 'empresa', label: 'Empresa' },
]

const techniciansOptions = [
  { value: '_all', label: 'Todos' },
  { value: '1', label: '1 técnico' },
  { value: '2-5', label: '2-5 técnicos' },
  { value: '6-10', label: '6-10 técnicos' },
  { value: '11+', label: '11+ técnicos' },
]

const entityTypeLabels: Record<string, string> = {
  tecnico: 'Tecnico',
  eni: 'ENI',
  empresa: 'Empresa',
}

const entityTypeIcons: Record<string, typeof User> = {
  tecnico: User,
  eni: Briefcase,
  empresa: Building2,
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'> = {
  novo: 'info',
  em_onboarding: 'warning',
  on_hold: 'warning',
  abandonado: 'destructive',
  arquivado: 'secondary',
}

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  em_onboarding: 'Em Onboarding',
  on_hold: 'On-Hold',
  abandonado: 'Abandonado',
  arquivado: 'Arquivado',
}

export function CandidaturasClientView({ initialData, services }: CandidaturasClientViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Local state for instant search
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [abandonDialogOpen, setAbandonDialogOpen] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Get URL-based filters
  const currentStatus = searchParams.get('status') || 'all'
  const currentEntity = searchParams.get('entityType') || '_all'
  const currentTechnicians = searchParams.get('technicians') || '_all'
  const currentDateFrom = searchParams.get('dateFrom') || ''
  const currentDateTo = searchParams.get('dateTo') || ''
  const currentView = searchParams.get('view') || 'list'
  const sortBy = searchParams.get('sortBy') || 'first_application_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  const currentCounties = useMemo(() => {
    const param = searchParams.get('counties')
    return param ? param.split(',') : []
  }, [searchParams])

  const currentServices = useMemo(() => {
    const param = searchParams.get('services')
    return param ? param.split(',') : []
  }, [searchParams])

  // Build SWR cache key from URL filters (excluding text search which is client-side)
  const swrKey = useMemo(() => {
    const params = new URLSearchParams()
    if (currentStatus !== 'all') params.set('status', currentStatus)
    if (currentEntity !== '_all') params.set('entityType', currentEntity)
    if (currentTechnicians !== '_all') params.set('technicians', currentTechnicians)
    if (currentDateFrom) params.set('dateFrom', currentDateFrom)
    if (currentDateTo) params.set('dateTo', currentDateTo)
    if (currentCounties.length > 0) params.set('counties', currentCounties.join(','))
    if (currentServices.length > 0) params.set('services', currentServices.join(','))
    params.set('sortBy', sortBy)
    params.set('sortOrder', sortOrder)
    return `/api/candidaturas?${params.toString()}`
  }, [currentStatus, currentEntity, currentTechnicians, currentDateFrom, currentDateTo, currentCounties, currentServices, sortBy, sortOrder])

  // SWR with stale-while-revalidate - uses initialData from server, caches in browser
  const { data: swrData, isValidating } = useSWR<PaginatedCandidaturas>(
    swrKey,
    fetcher,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
    }
  )

  // Use SWR data (falls back to initialData on first render)
  const candidaturasData = swrData || initialData

  const serviceOptions = useMemo(() =>
    services.map(s => ({ value: s, label: s }))
  , [services])

  // Apply client-side fuzzy search filtering
  const filteredData = useMemo(() => {
    const allProviders = candidaturasData.data

    if (!searchQuery.trim()) {
      return allProviders
    }

    const query = searchQuery.trim()

    return allProviders.filter(provider => {
      // Check name
      if (fuzzyMatch(provider.name || '', query, 75)) return true

      // Check email (exact substring match for emails)
      if (provider.email && normalizeText(provider.email).includes(normalizeText(query))) return true

      // Check NIF (exact substring match)
      if (provider.nif && provider.nif.includes(query)) return true

      // Check phone
      if (provider.phone && provider.phone.includes(query)) return true

      return false
    })
  }, [candidaturasData.data, searchQuery])

  // Apply client-side sorting
  const sortedData = useMemo(() => {
    const sorted = [...filteredData]

    sorted.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'entity_type':
          comparison = (a.entity_type || '').localeCompare(b.entity_type || '')
          break
        case 'num_technicians':
          comparison = (a.num_technicians || 0) - (b.num_technicians || 0)
          break
        case 'first_application_at':
          const dateA = a.first_application_at || a.created_at || ''
          const dateB = b.first_application_at || b.created_at || ''
          comparison = dateA.localeCompare(dateB)
          break
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '')
          break
        default:
          comparison = 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [filteredData, sortBy, sortOrder])

  // Client-side pagination
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const totalFiltered = sortedData.length
  const totalPages = Math.ceil(totalFiltered / limit)
  const paginatedData = sortedData.slice((page - 1) * limit, page * limit)

  // URL update helpers
  const updateUrlParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all' && value !== '_all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/candidaturas?${params.toString()}`)
  }, [router, searchParams])

  const updateMultiUrlParam = useCallback((key: string, values: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    if (values.length > 0) {
      params.set(key, values.join(','))
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/candidaturas?${params.toString()}`)
  }, [router, searchParams])

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (sortBy === column) {
      params.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sortBy', column)
      params.set('sortOrder', 'asc')
    }
    params.set('page', '1')
    router.push(`/candidaturas?${params.toString()}`)
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/candidaturas?${params.toString()}`)
  }

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', newLimit)
    params.set('page', '1')
    router.push(`/candidaturas?${params.toString()}`)
  }

  const setView = (view: 'list' | 'grid') => {
    const params = new URLSearchParams(searchParams.toString())
    if (view === 'list') {
      params.delete('view')
    } else {
      params.set('view', view)
    }
    router.push(`/candidaturas?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearchQuery('')
    router.push('/candidaturas')
  }

  const handleSendToOnboarding = (id: string) => {
    setSelectedProviderId(id)
    setSendDialogOpen(true)
  }

  const handleAbandon = (id: string) => {
    setSelectedProviderId(id)
    setAbandonDialogOpen(true)
  }

  const hasFilters = currentStatus !== 'all' ||
    (currentEntity && currentEntity !== '_all') ||
    (currentTechnicians && currentTechnicians !== '_all') ||
    currentCounties.length > 0 ||
    currentServices.length > 0 ||
    currentDateFrom ||
    currentDateTo ||
    searchQuery

  const hasAdvancedFilters = currentCounties.length > 0 ||
    currentServices.length > 0 ||
    (currentTechnicians && currentTechnicians !== '_all') ||
    currentDateFrom ||
    currentDateTo

  return (
    <>
      <div className="space-y-6">
        {/* Filters Section */}
        <div className="space-y-4">
          {/* Search - Instant fuzzy search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, email ou NIF..."
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

          {/* Status & Type Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Estado:</span>
              <div className="flex gap-1">
                {statusOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={currentStatus === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateUrlParam('status', option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <SearchableSelect
                options={entityOptions}
                value={currentEntity}
                onValueChange={(value) => updateUrlParam('entityType', value)}
                placeholder="Todos os tipos"
                searchPlaceholder="Pesquisar tipo..."
                className="w-[160px] h-8"
              />
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

            {/* View Toggle */}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/50 ml-auto">
              <Button
                variant={currentView === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('list')}
                className="h-7 px-2.5 gap-1.5"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </Button>
              <Button
                variant={currentView === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('grid')}
                className="h-7 px-2.5 gap-1.5"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Grelha</span>
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Zona de atuação</label>
                <CoverageFilter
                  selected={currentCounties}
                  onChange={(values) => updateMultiUrlParam('counties', values)}
                  placeholder="Selecionar cobertura"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo de serviço</label>
                <SearchableMultiSelect
                  options={serviceOptions}
                  values={currentServices}
                  onValuesChange={(values) => updateMultiUrlParam('services', values)}
                  placeholder="Selecionar servicos"
                  searchPlaceholder="Pesquisar servico..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Nº de técnicos
                </label>
                <SearchableSelect
                  options={techniciansOptions}
                  value={currentTechnicians}
                  onValueChange={(value) => updateUrlParam('technicians', value)}
                  placeholder="Todos"
                  searchPlaceholder="Pesquisar..."
                  className="w-full h-8"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data de candidatura (desde)</label>
                <DatePicker
                  value={currentDateFrom ? parseISO(currentDateFrom) : null}
                  onChange={(date) => updateUrlParam('dateFrom', date ? format(date, 'yyyy-MM-dd') : '')}
                  placeholder="Selecionar data"
                  toDate={currentDateTo ? parseISO(currentDateTo) : undefined}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data de candidatura (até)</label>
                <DatePicker
                  value={currentDateTo ? parseISO(currentDateTo) : null}
                  onChange={(date) => updateUrlParam('dateTo', date ? format(date, 'yyyy-MM-dd') : '')}
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
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                A mostrar <span className="font-medium text-foreground">{paginatedData.length}</span> de{' '}
                <span className="font-medium text-foreground">{totalFiltered}</span> candidaturas
                {searchQuery && (
                  <span className="text-primary"> (filtradas de {candidaturasData.total})</span>
                )}
                {isValidating && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
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
                    <SelectItem value="500">500</SelectItem>
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
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery
                  ? `Nenhuma candidatura encontrada para "${searchQuery}"`
                  : 'Nenhuma candidatura encontrada'}
              </p>
            </div>
          )}

          {/* List View */}
          {currentView === 'list' && paginatedData.length > 0 && (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Candidato
                        {getSortIcon('name')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('entity_type')}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Tipo
                        {getSortIcon('entity_type')}
                      </button>
                    </TableHead>
                    <TableHead>Serviços</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('num_technicians')}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Técnicos
                        {getSortIcon('num_technicians')}
                      </button>
                    </TableHead>
                    <TableHead>Zonas</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('first_application_at')}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Data
                        {getSortIcon('first_application_at')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Estado
                        {getSortIcon('status')}
                      </button>
                    </TableHead>
                    <TableHead>Ações</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((provider) => {
                    const EntityIcon = entityTypeIcons[provider.entity_type] || User

                    return (
                      <TableRow key={provider.id} className="group">
                        <TableCell>
                          <ProviderLink
                            href={`/providers/${provider.id}?tab=perfil`}
                            className="flex items-center gap-3 hover:text-primary transition-colors"
                          >
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <EntityIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{provider.name}</p>
                                {provider.application_count && provider.application_count > 1 && (
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {provider.application_count}x
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{provider.email}</p>
                            </div>
                          </ProviderLink>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {entityTypeLabels[provider.entity_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-50">
                          <div className="flex items-center gap-1">
                            {provider.services && provider.services.length > 0 && (
                              <Badge variant="secondary" className="text-xs truncate max-w-35">
                                {provider.services[0]}
                              </Badge>
                            )}
                            {provider.services && provider.services.length > 1 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs shrink-0 cursor-default">
                                      +{provider.services.length - 1}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-64">
                                    <div className="flex flex-col gap-1">
                                      {provider.services.slice(1).map((service: string, idx: number) => (
                                        <span key={idx} className="text-xs">{service}</span>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {(!provider.services || provider.services.length === 0) && (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {provider.num_technicians ?? '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[150px]">
                              {provider.districts?.slice(0, 2).join(', ') || '-'}
                              {provider.districts && provider.districts.length > 2 && '...'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(provider.first_application_at || provider.created_at || new Date().toISOString())}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={provider.status ? statusVariants[provider.status] : 'default'}>
                            {provider.status ? statusLabels[provider.status] : 'Desconhecido'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {provider.status === 'novo' && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleSendToOnboarding(provider.id)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Onboarding
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAbandon(provider.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <ProviderLink href={`/providers/${provider.id}?tab=perfil`}>
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </ProviderLink>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Grid View */}
          {currentView === 'grid' && paginatedData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedData.map((provider) => (
                <CandidaturaCard
                  key={provider.id}
                  provider={provider}
                  onSendToOnboarding={handleSendToOnboarding}
                  onAbandon={handleAbandon}
                />
              ))}
            </div>
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
                Pagina <span className="font-medium text-foreground">{page}</span> de{' '}
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

      <SendToOnboardingDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        providerId={selectedProviderId}
      />

      <AbandonDialog
        open={abandonDialogOpen}
        onOpenChange={setAbandonDialogOpen}
        providerId={selectedProviderId}
      />
    </>
  )
}
