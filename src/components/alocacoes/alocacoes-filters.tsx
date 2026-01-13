'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { Search, CalendarIcon, X, Filter } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { AvailablePeriod } from '@/lib/allocations/actions'
import type { DateRange } from 'react-day-picker'

interface AlocacoesFiltersProps {
  availablePeriods: AvailablePeriod[]
}

export function AlocacoesFilters({ availablePeriods }: AlocacoesFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get current filter values from URL
  const search = searchParams.get('search') || ''
  const periodFrom = searchParams.get('periodFrom') || ''
  const periodTo = searchParams.get('periodTo') || ''
  const acceptanceRate = searchParams.get('acceptanceRate') || ''
  const expirationRate = searchParams.get('expirationRate') || ''
  const volume = searchParams.get('volume') || ''

  // Date range state for calendar
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (periodFrom && periodTo) {
      return {
        from: new Date(periodFrom),
        to: new Date(periodTo)
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

    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  const debouncedSearch = useDebounce((value: string) => {
    updateParams({ search: value || null })
  }, 300)

  const handlePeriodSelect = (periodKey: string) => {
    if (periodKey === 'all') {
      setDateRange(undefined)
      updateParams({ periodFrom: null, periodTo: null })
    } else if (periodKey === 'custom') {
      // Do nothing, calendar will handle it
    } else {
      const period = availablePeriods.find(p => `${p.periodFrom}_${p.periodTo}` === periodKey)
      if (period) {
        setDateRange({
          from: new Date(period.periodFrom),
          to: new Date(period.periodTo)
        })
        updateParams({
          periodFrom: period.periodFrom,
          periodTo: period.periodTo
        })
      }
    }
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to) {
      updateParams({
        periodFrom: format(range.from, 'yyyy-MM-dd'),
        periodTo: format(range.to, 'yyyy-MM-dd')
      })
    }
  }

  const clearFilters = () => {
    setDateRange(undefined)
    router.push('?page=1')
  }

  const hasActiveFilters = search || periodFrom || acceptanceRate || expirationRate || volume

  // Get current period label
  const getCurrentPeriodLabel = () => {
    if (!periodFrom || !periodTo) return 'Todos os períodos'

    const period = availablePeriods.find(
      p => p.periodFrom === periodFrom && p.periodTo === periodTo
    )
    if (period) return period.label

    // Custom date range
    const from = new Date(periodFrom)
    const to = new Date(periodTo)
    return `${format(from, 'dd/MM/yyyy')} - ${format(to, 'dd/MM/yyyy')}`
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar prestador..."
          className="pl-9"
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
        />
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

      {/* Acceptance Rate Filter */}
      <Select
        value={acceptanceRate}
        onValueChange={(value) => updateParams({ acceptanceRate: value || null })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Taxa aceitação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as taxas</SelectItem>
          <SelectItem value="high">Alta (&gt;70%)</SelectItem>
          <SelectItem value="medium">Média (40-70%)</SelectItem>
          <SelectItem value="low">Baixa (&lt;40%)</SelectItem>
        </SelectContent>
      </Select>

      {/* Expiration Rate Filter */}
      <Select
        value={expirationRate}
        onValueChange={(value) => updateParams({ expirationRate: value || null })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Taxa expiração" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as taxas</SelectItem>
          <SelectItem value="low">Baixa (&lt;10%)</SelectItem>
          <SelectItem value="medium">Média (10-30%)</SelectItem>
          <SelectItem value="high">Alta (&gt;30%)</SelectItem>
        </SelectContent>
      </Select>

      {/* Volume Filter */}
      <Select
        value={volume}
        onValueChange={(value) => updateParams({ volume: value || null })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Volume" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="high">Alto (&gt;50)</SelectItem>
          <SelectItem value="medium">Médio (10-50)</SelectItem>
          <SelectItem value="low">Baixo (&lt;10)</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters button */}
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
