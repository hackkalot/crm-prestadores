'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { useCallback, useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'novo', label: 'Novos' },
  { value: 'em_onboarding', label: 'Em Onboarding' },
  { value: 'abandonado', label: 'Abandonados' },
]

const entityOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'eni', label: 'ENI' },
  { value: 'empresa', label: 'Empresa' },
]

interface CandidaturasFiltersProps {
  districts: string[]
  services: string[]
}

export function CandidaturasFilters({ districts, services }: CandidaturasFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [search, setSearch] = useState(searchParams.get('search') || '')

  const currentStatus = searchParams.get('status') || 'all'
  const currentEntity = searchParams.get('entityType') || ''
  const currentDistrict = searchParams.get('district') || ''
  const currentService = searchParams.get('service') || ''
  const currentDateFrom = searchParams.get('dateFrom') || ''
  const currentDateTo = searchParams.get('dateTo') || ''

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all' && value !== '_all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    startTransition(() => {
      router.push(`/candidaturas?${params.toString()}`)
    })
  }, [router, searchParams])

  const handleSearch = () => {
    updateFilter('search', search)
  }

  const clearFilters = () => {
    setSearch('')
    startTransition(() => {
      router.push('/candidaturas')
    })
  }

  const hasFilters = currentStatus !== 'all' || currentEntity || currentDistrict ||
    currentService || currentDateFrom || currentDateTo || searchParams.get('search')

  const hasAdvancedFilters = currentDistrict || currentService || currentDateFrom || currentDateTo

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
          <select
            value={currentEntity}
            onChange={(e) => updateFilter('entityType', e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
            disabled={isPending}
          >
            {entityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          {/* District Filter */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Zona de atuação</label>
            <Select
              value={currentDistrict || '_all'}
              onValueChange={(value) => updateFilter('district', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os distritos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos os distritos</SelectItem>
                {districts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Filter */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tipo de serviço</label>
            <Select
              value={currentService || '_all'}
              onValueChange={(value) => updateFilter('service', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os serviços" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos os serviços</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
