'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { CoverageFilter } from '@/components/ui/coverage-filter'
import { DatePicker } from '@/components/ui/date-picker'
import { Search, X, Filter, ChevronDown, ChevronUp, List, LayoutGrid } from 'lucide-react'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'novo', label: 'Novos' },
  { value: 'em_onboarding', label: 'Em Onboarding' },
  { value: 'abandonado', label: 'Abandonados' },
]

const entityOptions = [
  { value: '_all', label: 'Todos os tipos' },
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'eni', label: 'ENI' },
  { value: 'empresa', label: 'Empresa' },
]

interface CandidaturasFiltersProps {
  services: string[]
}

export function CandidaturasFilters({ services }: CandidaturasFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [search, setSearch] = useState(searchParams.get('search') || '')

  const currentStatus = searchParams.get('status') || 'all'
  const currentEntity = searchParams.get('entityType') || '_all'
  const currentDateFrom = searchParams.get('dateFrom') || ''
  const currentDateTo = searchParams.get('dateTo') || ''
  const currentView = searchParams.get('view') || 'list'

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

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all' && value !== '_all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset to page 1 when filters change
    params.delete('page')
    startTransition(() => {
      router.push(`/candidaturas?${params.toString()}`)
    })
  }, [router, searchParams])

  const updateMultiFilter = useCallback((key: string, values: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    if (values.length > 0) {
      params.set(key, values.join(','))
    } else {
      params.delete(key)
    }
    // Reset to page 1 when filters change
    params.delete('page')
    startTransition(() => {
      router.push(`/candidaturas?${params.toString()}`)
    })
  }, [router, searchParams])

  const setView = (view: 'list' | 'grid') => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (view === 'list') {
        params.delete('view')
      } else {
        params.set('view', view)
      }
      router.push(`/candidaturas?${params.toString()}`)
    })
  }

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    // Reset to page 1 when searching
    params.delete('page')
    startTransition(() => {
      router.push(`/candidaturas?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setSearch('')
    startTransition(() => {
      router.push('/candidaturas')
    })
  }

  const hasFilters = currentStatus !== 'all' ||
    (currentEntity && currentEntity !== '_all') ||
    currentCounties.length > 0 ||
    currentServices.length > 0 ||
    currentDateFrom ||
    currentDateTo ||
    searchParams.get('search')

  const hasAdvancedFilters = currentCounties.length > 0 ||
    currentServices.length > 0 ||
    currentDateFrom ||
    currentDateTo

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, email ou NIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={isPending}>
          Pesquisar
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
          Filtros avancados
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
            disabled={isPending}
            className="h-7 px-2.5 gap-1.5"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </Button>
          <Button
            variant={currentView === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('grid')}
            disabled={isPending}
            className="h-7 px-2.5 gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Grelha</span>
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          {/* Coverage Filter - Hierarchical districts/counties */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Zona de atuação</label>
            <CoverageFilter
              selected={currentCounties}
              onChange={(values) => updateMultiFilter('counties', values)}
              placeholder="Selecionar cobertura"
              disabled={isPending}
            />
          </div>

          {/* Service Filter - Multi-select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tipo de serviço</label>
            <SearchableMultiSelect
              options={serviceOptions}
              values={currentServices}
              onValuesChange={(values) => updateMultiFilter('services', values)}
              placeholder="Selecionar servicos"
              searchPlaceholder="Pesquisar servico..."
              disabled={isPending}
            />
          </div>

          {/* Date From */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Data de candidatura (desde)</label>
            <DatePicker
              value={currentDateFrom ? parseISO(currentDateFrom) : null}
              onChange={(date) => updateFilter('dateFrom', date ? format(date, 'yyyy-MM-dd') : '')}
              placeholder="Selecionar data"
              toDate={currentDateTo ? parseISO(currentDateTo) : undefined}
            />
          </div>

          {/* Date To */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Data de candidatura (ate)</label>
            <DatePicker
              value={currentDateTo ? parseISO(currentDateTo) : null}
              onChange={(date) => updateFilter('dateTo', date ? format(date, 'yyyy-MM-dd') : '')}
              placeholder="Selecionar data"
              fromDate={currentDateFrom ? parseISO(currentDateFrom) : undefined}
            />
          </div>
        </div>
      )}
    </div>
  )
}
