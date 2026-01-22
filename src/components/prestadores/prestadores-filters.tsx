'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { CoverageFilter } from '@/components/ui/coverage-filter'
import { Search, X, Filter, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useCallback, useMemo, useState, useTransition, useEffect, useRef } from 'react'

// Debounce delay for search (ms)
const SEARCH_DEBOUNCE_MS = 300

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

interface PrestadoresFiltersProps {
  services: string[]
  users: Array<{ id: string; name: string; email: string }>
}

export function PrestadoresFilters({ services, users }: PrestadoresFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const currentStatus = searchParams.get('status') || '_all'
  const currentEntity = searchParams.get('entityType') || '_all'
  const currentOwnerId = searchParams.get('ownerId') || '_all'
  const currentHasPedidos = searchParams.get('hasPedidos') || '_all'

  // Parse multi-select values from URL (comma-separated)
  const currentCounties = useMemo(() => {
    const param = searchParams.get('counties')
    return param ? param.split(',') : []
  }, [searchParams])

  const currentServices = useMemo(() => {
    const param = searchParams.get('services')
    return param ? param.split(',') : []
  }, [searchParams])

  const serviceOptions = useMemo(() =>
    services.map(s => ({ value: s, label: s }))
  , [services])

  const userOptions = useMemo(() => [
    { value: '_all', label: 'Todos' },
    ...users.map(u => ({ value: u.id, label: u.name || u.email || 'Utilizador' }))
  ], [users])

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== '_all') {
      // Only add to URL if not the default '_all'
      params.set(key, value)
    } else {
      // Remove from URL if it's the default '_all'
      params.delete(key)
    }
    startTransition(() => {
      router.push(`/prestadores?${params.toString()}`)
    })
  }, [router, searchParams])

  const updateMultiFilter = useCallback((key: string, values: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    if (values.length > 0) {
      params.set(key, values.join(','))
    } else {
      params.delete(key)
    }
    startTransition(() => {
      router.push(`/prestadores?${params.toString()}`)
    })
  }, [router, searchParams])

  // Debounced search - triggers automatically as user types
  const triggerSearch = useCallback((searchValue: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchValue && searchValue !== '_all') {
      params.set('search', searchValue)
    } else {
      params.delete('search')
    }
    startTransition(() => {
      router.push(`/prestadores?${params.toString()}`)
    })
  }, [router, searchParams])

  // Handle search input change with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Show searching indicator
    setIsSearching(true)

    // Debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(false)
      triggerSearch(value)
    }, SEARCH_DEBOUNCE_MS)
  }, [triggerSearch])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Immediate search (for Enter key or button click)
  const handleSearch = useCallback(() => {
    // Clear any pending debounced search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    setIsSearching(false)
    triggerSearch(search)
  }, [search, triggerSearch])

  const clearFilters = useCallback(() => {
    // Clear any pending debounced search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    setSearch('')
    setIsSearching(false)
    startTransition(() => {
      router.push('/prestadores')
    })
  }, [router])

  const hasFilters = (currentStatus !== 'all' && currentStatus !== '_all') ||
    (currentEntity && currentEntity !== '_all') ||
    currentCounties.length > 0 ||
    currentServices.length > 0 ||
    (currentOwnerId && currentOwnerId !== '_all') ||
    (currentHasPedidos && currentHasPedidos !== '_all') ||
    searchParams.get('search')

  const hasAdvancedFilters = currentCounties.length > 0 ||
    currentServices.length > 0 ||
    (currentOwnerId && currentOwnerId !== '_all')

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            placeholder="Pesquisar por nome, email ou NIF..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={isPending || isSearching}>
          {isPending ? 'A pesquisar...' : 'Pesquisar'}
        </Button>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} disabled={isPending}>
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
                onClick={() => updateFilter('status', option.value)}
                disabled={isPending}
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
            onValueChange={(value) => updateFilter('entityType', value)}
            placeholder="Todos os tipos"
            searchPlaceholder="Pesquisar tipo..."
            disabled={isPending}
            className="w-40 h-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Pedidos:</span>
          <SearchableSelect
            options={pedidosOptions}
            value={currentHasPedidos}
            onValueChange={(value) => updateFilter('hasPedidos', value)}
            placeholder="Todos"
            searchPlaceholder="Pesquisar..."
            disabled={isPending}
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
              onChange={(values) => updateMultiFilter('counties', values)}
              placeholder="Zona de atuação"
              disabled={isPending}
            />
          </div>

          {/* Service Filter - Multi-select */}
          <div className="space-y-1.5">
            <SearchableMultiSelect
              options={serviceOptions}
              values={currentServices}
              onValuesChange={(values) => updateMultiFilter('services', values)}
              placeholder="Tipo de serviço"
              searchPlaceholder="Pesquisar serviço..."
              disabled={isPending}
            />
          </div>

          {/* Owner Filter */}
          <div className="space-y-1.5">
            <SearchableSelect
              options={userOptions}
              value={currentOwnerId}
              onValueChange={(value) => updateFilter('ownerId', value)}
              placeholder="Responsável"
              searchPlaceholder="Pesquisar responsável..."
              disabled={isPending}
            />
          </div>
        </div>
      )}
    </div>
  )
}
