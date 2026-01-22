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
import { fuzzyMatch, normalizeText } from '@/hooks/use-fuzzy-search'
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  Briefcase,
  Building2,
  MapPin,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Loader2,
} from 'lucide-react'
import type { PaginatedPrestadores } from '@/lib/prestadores/actions'

// SWR fetcher for API route
const fetcher = (url: string) => fetch(url).then(res => res.json())

interface PrestadoresClientViewProps {
  initialData: PaginatedPrestadores
  services: string[]
  users: Array<{ id: string; name: string; email: string }>
  requestCounts: Record<number, number>
}

const statusOptions = [
  { value: '_all', label: 'Todos' },
  { value: 'all', label: 'Rede Ativa (Ativo + Suspenso)' },
  { value: 'novo', label: 'Novos' },
  { value: 'em_onboarding', label: 'Em Onboarding' },
  { value: 'on_hold', label: 'On-Hold' },
  { value: 'ativo', label: 'Ativos' },
  { value: 'suspenso', label: 'Suspensos' },
  { value: 'abandonado', label: 'Abandonados' },
  { value: 'arquivado', label: 'Arquivados' },
]

const entityOptions = [
  { value: '_all', label: 'Todos os tipos' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'eni', label: 'ENI' },
  { value: 'empresa', label: 'Empresa' },
]

const pedidosOptions = [
  { value: '_all', label: 'Todos' },
  { value: 'with', label: 'Com pedidos' },
  { value: 'without', label: 'Sem pedidos' },
]

const entityTypeLabels: Record<string, string> = {
  tecnico: 'Técnico',
  eni: 'ENI',
  empresa: 'Empresa',
}

const entityTypeIcons: Record<string, typeof User> = {
  tecnico: User,
  eni: Briefcase,
  empresa: Building2,
}

const statusLabels: Record<string, string> = {
  novo: 'Nova Candidatura',
  em_onboarding: 'Em Onboarding',
  on_hold: 'On-Hold',
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  abandonado: 'Abandonado',
  arquivado: 'Arquivado',
}

const statusVariants: Record<string, 'info' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
  novo: 'info',
  em_onboarding: 'warning',
  on_hold: 'warning',
  ativo: 'success',
  suspenso: 'destructive',
  abandonado: 'secondary',
  arquivado: 'secondary',
}

export function PrestadoresClientView({ initialData, services, users, requestCounts }: PrestadoresClientViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Local state for instant search
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Get URL-based filters
  const currentStatus = searchParams.get('status') || '_all'
  const currentEntity = searchParams.get('entityType') || '_all'
  const currentOwnerId = searchParams.get('ownerId') || '_all'
  const currentHasPedidos = searchParams.get('hasPedidos') || '_all'
  const sortBy = searchParams.get('sortBy') || 'name'
  const sortOrder = searchParams.get('sortOrder') || 'asc'

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
    if (currentStatus !== '_all') params.set('status', currentStatus)
    if (currentEntity !== '_all') params.set('entityType', currentEntity)
    if (currentOwnerId !== '_all') params.set('ownerId', currentOwnerId)
    if (currentHasPedidos !== '_all') params.set('hasPedidos', currentHasPedidos)
    if (currentCounties.length > 0) params.set('counties', currentCounties.join(','))
    if (currentServices.length > 0) params.set('services', currentServices.join(','))
    params.set('sortBy', sortBy)
    params.set('sortOrder', sortOrder)
    return `/api/prestadores?${params.toString()}`
  }, [currentStatus, currentEntity, currentOwnerId, currentHasPedidos, currentCounties, currentServices, sortBy, sortOrder])

  // SWR with stale-while-revalidate - uses initialData from server, caches in browser
  const { data: swrData, isValidating } = useSWR<PaginatedPrestadores>(
    swrKey,
    fetcher,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  // Use SWR data (falls back to initialData on first render)
  const prestadoresData = swrData || initialData

  const serviceOptions = useMemo(() =>
    services.map(s => ({ value: s, label: s }))
  , [services])

  const userOptions = useMemo(() => [
    { value: '_all', label: 'Todos' },
    ...users.map(u => ({ value: u.id, label: u.name || u.email || 'Utilizador' }))
  ], [users])

  // Apply client-side fuzzy search filtering
  const filteredData = useMemo(() => {
    const allProviders = prestadoresData.data

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
  }, [prestadoresData.data, searchQuery])

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
    if (value && value !== '_all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/prestadores?${params.toString()}`)
  }, [router, searchParams])

  const updateMultiUrlParam = useCallback((key: string, values: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    if (values.length > 0) {
      params.set(key, values.join(','))
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/prestadores?${params.toString()}`)
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
    router.push(`/prestadores?${params.toString()}`)
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
    router.push(`/prestadores?${params.toString()}`)
  }

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', newLimit)
    params.set('page', '1')
    router.push(`/prestadores?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearchQuery('')
    router.push('/prestadores')
  }

  const hasFilters = (currentStatus !== '_all') ||
    (currentEntity && currentEntity !== '_all') ||
    currentCounties.length > 0 ||
    currentServices.length > 0 ||
    (currentOwnerId && currentOwnerId !== '_all') ||
    (currentHasPedidos && currentHasPedidos !== '_all') ||
    searchQuery

  const hasAdvancedFilters = currentCounties.length > 0 ||
    currentServices.length > 0 ||
    (currentOwnerId && currentOwnerId !== '_all')

  return (
    <div className="space-y-4">
      {/* Search */}
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
            className="w-40 h-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Pedidos:</span>
          <SearchableSelect
            options={pedidosOptions}
            value={currentHasPedidos}
            onValueChange={(value) => updateUrlParam('hasPedidos', value)}
            placeholder="Todos"
            searchPlaceholder="Pesquisar..."
            className="w-36 h-8"
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
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          {/* Coverage Filter - Hierarchical districts/counties */}
          <div className="space-y-1.5">
            <CoverageFilter
              selected={currentCounties}
              onChange={(values) => updateMultiUrlParam('counties', values)}
              placeholder="Zona de atuação"
            />
          </div>

          {/* Service Filter - Multi-select */}
          <div className="space-y-1.5">
            <SearchableMultiSelect
              options={serviceOptions}
              values={currentServices}
              onValuesChange={(values) => updateMultiUrlParam('services', values)}
              placeholder="Tipo de serviço"
              searchPlaceholder="Pesquisar serviço..."
            />
          </div>

          {/* Owner Filter */}
          <div className="space-y-1.5">
            <SearchableSelect
              options={userOptions}
              value={currentOwnerId}
              onValueChange={(value) => updateUrlParam('ownerId', value)}
              placeholder="Responsável"
              searchPlaceholder="Pesquisar responsável..."
            />
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-4">
        {/* Pagination Controls - Top */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              A mostrar <span className="font-medium text-foreground">{paginatedData.length}</span> de{' '}
              <span className="font-medium text-foreground">{totalFiltered}</span> prestadores
              {searchQuery && (
                <span className="text-primary"> (filtrados de {prestadoresData.total})</span>
              )}
              {isValidating && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select value={limit.toString()} onValueChange={handleLimitChange}>
                <SelectTrigger className="w-[80px]">
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
                ? `Nenhum prestador encontrado para "${searchQuery}"`
                : 'Nenhum prestador encontrado com os filtros selecionados.'}
            </p>
          </div>
        )}

        {/* Table */}
        {paginatedData.length > 0 && (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Prestador
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
                  <TableHead>Zonas</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Estado
                      {getSortIcon('status')}
                    </button>
                  </TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((prestador) => {
                  const EntityIcon = entityTypeIcons[prestador.entity_type] || User

                  return (
                    <TableRow key={prestador.id} className="group">
                      <TableCell>
                        <ProviderLink
                          href={`/providers/${prestador.id}?tab=perfil`}
                          className="flex items-center gap-3 hover:text-primary transition-colors"
                        >
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <EntityIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{prestador.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{prestador.email}</p>
                          </div>
                        </ProviderLink>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entityTypeLabels[prestador.entity_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">
                            {prestador.districts?.slice(0, 2).join(', ')}
                            {prestador.districts && prestador.districts.length > 2 && '...'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-center gap-1">
                          {prestador.services && prestador.services.length > 0 && (
                            <Badge variant="secondary" className="text-xs truncate max-w-[140px]">
                              {prestador.services[0]}
                            </Badge>
                          )}
                          {prestador.services && prestador.services.length > 1 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs shrink-0 cursor-default">
                                    +{prestador.services.length - 1}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[250px]">
                                  <div className="flex flex-col gap-1">
                                    {prestador.services.slice(1).map((service: string, idx: number) => (
                                      <span key={idx} className="text-xs">{service}</span>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {prestador.backoffice_provider_id ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <ProviderLink
                                  href={`/providers/${prestador.id}?tab=pedidos`}
                                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span className="font-medium">
                                    {requestCounts[prestador.backoffice_provider_id] || 0}
                                  </span>
                                </ProviderLink>
                              </TooltipTrigger>
                              <TooltipContent>Ver pedidos</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariants[prestador.status || ''] || 'secondary'}
                        >
                          {statusLabels[prestador.status || ''] || prestador.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {prestador.relationship_owner?.name || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ProviderLink href={`/providers/${prestador.id}?tab=perfil`}>
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
  )
}
