'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Search, X, CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import type { AvailableBillingPeriod } from '@/lib/billing/actions'

// Debounce delay for search (ms)
const SEARCH_DEBOUNCE_MS = 300

interface FaturacaoFiltersProps {
  providers: string[]
  services: string[]
  statuses: string[]
  availablePeriods: AvailableBillingPeriod[]
}

export function FaturacaoFilters({
  providers,
  services,
  statuses,
  availablePeriods,
}: FaturacaoFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get current filter values from URL
  const search = searchParams.get('search') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''

  // Local state for search input
  const [searchInput, setSearchInput] = useState(search)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Date range state for calendar
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (dateFrom && dateTo) {
      return {
        from: new Date(dateFrom),
        to: new Date(dateTo)
      }
    }
    return undefined
  })

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    // Reset to page 1 when filters change
    params.set('page', '1')

    router.push(`/faturacao?${params.toString()}`)
  }, [router, searchParams])

  // Debounced search - triggers automatically as user types
  const triggerSearch = useCallback((searchValue: string) => {
    updateParams({ search: searchValue || null })
  }, [updateParams])

  // Handle search input change with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)

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
    triggerSearch(searchInput)
  }, [searchInput, triggerSearch])

  const handlePeriodSelect = (periodKey: string) => {
    if (periodKey === 'all') {
      setDateRange(undefined)
      updateParams({ dateFrom: null, dateTo: null })
    } else {
      const period = availablePeriods.find(p => `${p.periodFrom}_${p.periodTo}` === periodKey)
      if (period) {
        setDateRange({
          from: new Date(period.periodFrom),
          to: new Date(period.periodTo)
        })
        updateParams({
          dateFrom: period.periodFrom,
          dateTo: period.periodTo
        })
      }
    }
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to) {
      updateParams({
        dateFrom: format(range.from, 'yyyy-MM-dd'),
        dateTo: format(range.to, 'yyyy-MM-dd')
      })
    }
  }

  const clearFilters = useCallback(() => {
    // Clear any pending debounced search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    setDateRange(undefined)
    setSearchInput('')
    setIsSearching(false)
    router.push('/faturacao?page=1')
  }, [router])

  const hasActiveFilters =
    searchParams.get('status') ||
    searchParams.get('provider') ||
    searchParams.get('service') ||
    searchParams.get('search') ||
    searchParams.get('dateFrom') ||
    searchParams.get('dateTo')

  // Get current period label
  const getCurrentPeriodLabel = () => {
    if (!dateFrom || !dateTo) return 'Todos os períodos'

    const period = availablePeriods.find(
      p => p.periodFrom === dateFrom && p.periodTo === dateTo
    )
    if (period) return period.label

    // Custom date range
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    return `${format(from, 'dd/MM/yyyy')} - ${format(to, 'dd/MM/yyyy')}`
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative">
          {isSearching ? (
            <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Pesquisar codigo, prestador..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-[250px] pl-9 pr-8"
          />
          {searchInput && (
            <button
              onClick={() => {
                // Clear any pending debounced search
                if (searchTimeoutRef.current) {
                  clearTimeout(searchTimeoutRef.current)
                }
                setSearchInput('')
                setIsSearching(false)
                updateParams({ search: null })
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={handleSearch} disabled={isSearching}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Period selector */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getCurrentPeriodLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <p className="text-sm font-medium mb-2">Selecionar período</p>
            <Select onValueChange={handlePeriodSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher período..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                {availablePeriods.map((period) => (
                  <SelectItem
                    key={`${period.periodFrom}_${period.periodTo}`}
                    value={`${period.periodFrom}_${period.periodTo}`}
                  >
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 border-b">
            <p className="text-sm font-medium mb-2">Ou selecionar intervalo personalizado</p>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeSelect}
              locale={pt}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Status Filter */}
      <Select
        value={searchParams.get('status') || 'all'}
        onValueChange={(value) => updateParams({ status: value === 'all' ? null : value })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Provider Filter */}
      <Select
        value={searchParams.get('provider') || 'all'}
        onValueChange={(value) => updateParams({ provider: value === 'all' ? null : value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Prestador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {providers.map((provider) => (
            <SelectItem key={provider} value={provider}>
              {provider}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Service Filter */}
      <Select
        value={searchParams.get('service') || 'all'}
        onValueChange={(value) => updateParams({ service: value === 'all' ? null : value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Serviço" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {services.map((service) => (
            <SelectItem key={service} value={service}>
              {service}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  )
}
