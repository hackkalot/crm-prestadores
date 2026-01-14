'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, X, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import { DATE_PRESETS } from '@/lib/analytics/constants'
import type { AnalyticsFilterOptions } from '@/lib/analytics/types'

interface AnalyticsFiltersProps {
  filterOptions: AnalyticsFilterOptions
}

export function AnalyticsFilters({ filterOptions }: AnalyticsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const selectedCategory = searchParams.get('category') || ''
  const selectedService = searchParams.get('service') || ''

  // Date range state for calendar
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (dateFrom && dateTo) {
      return {
        from: new Date(dateFrom),
        to: new Date(dateTo),
      }
    }
    return undefined
  })

  // Get services for selected category
  const availableServices = selectedCategory
    ? filterOptions.categoryServices[selectedCategory] || []
    : []

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())

        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === '') {
            params.delete(key)
          } else {
            params.set(key, value)
          }
        })

        router.push(`/analytics?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const handlePresetSelect = (preset: string) => {
    if (preset === 'all') {
      setDateRange(undefined)
      updateParams({ dateFrom: null, dateTo: null })
    } else {
      const days = parseInt(preset, 10)
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - days)

      setDateRange({ from, to })
      updateParams({
        dateFrom: format(from, 'yyyy-MM-dd'),
        dateTo: format(to, 'yyyy-MM-dd'),
      })
    }
  }

  const handlePeriodSelect = (periodKey: string) => {
    if (periodKey === 'all') {
      setDateRange(undefined)
      updateParams({ dateFrom: null, dateTo: null })
    } else {
      const period = filterOptions.periods.find(
        (p) => `${p.from}_${p.to}` === periodKey
      )
      if (period) {
        setDateRange({
          from: new Date(period.from),
          to: new Date(period.to),
        })
        updateParams({
          dateFrom: period.from,
          dateTo: period.to,
        })
      }
    }
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to) {
      updateParams({
        dateFrom: format(range.from, 'yyyy-MM-dd'),
        dateTo: format(range.to, 'yyyy-MM-dd'),
      })
    }
  }

  const handleCategoryChange = (value: string) => {
    if (value === 'all') {
      // Clear category and service
      updateParams({ category: null, service: null })
    } else {
      // Set category and clear service (will be filtered by new category)
      updateParams({ category: value, service: null })
    }
  }

  const handleServiceChange = (value: string) => {
    if (value === 'all') {
      updateParams({ service: null })
    } else {
      updateParams({ service: value })
    }
  }

  const clearFilters = () => {
    setDateRange(undefined)
    updateParams({ dateFrom: null, dateTo: null, category: null, service: null })
  }

  const hasActiveFilters = dateFrom || dateTo || selectedCategory || selectedService

  // Get current period label
  const getCurrentPeriodLabel = () => {
    if (!dateFrom || !dateTo) return 'Mês atual'

    // Check if matches a preset
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    const daysDiff = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    )

    const preset = DATE_PRESETS.find((p) => p.days === daysDiff)
    if (preset) return preset.label

    // Check if matches an available period
    const period = filterOptions.periods.find(
      (p) => p.from === dateFrom && p.to === dateTo
    )
    if (period) {
      return `${format(new Date(period.from), 'dd/MM/yyyy')} - ${format(new Date(period.to), 'dd/MM/yyyy')}`
    }

    // Custom range
    return `${format(from, 'dd/MM/yyyy')} - ${format(to, 'dd/MM/yyyy')}`
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period selector with calendar */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="min-w-[220px] justify-start"
            disabled={isPending}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getCurrentPeriodLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {/* Quick presets */}
          <div className="p-3 border-b">
            <p className="text-sm font-medium mb-2">Presets rápidos</p>
            <Select onValueChange={handlePresetSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher preset..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período (desde 2023)</SelectItem>
                {DATE_PRESETS.map((preset) => (
                  <SelectItem key={preset.days} value={preset.days.toString()}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Available periods from allocation_history */}
          {filterOptions.periods.length > 0 && (
            <div className="p-3 border-b">
              <p className="text-sm font-medium mb-2">Períodos de alocação</p>
              <Select onValueChange={handlePeriodSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher período..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período (desde 2023)</SelectItem>
                  {filterOptions.periods.map((period) => (
                    <SelectItem
                      key={`${period.from}_${period.to}`}
                      value={`${period.from}_${period.to}`}
                    >
                      {format(new Date(period.from), 'dd/MM/yyyy')} -{' '}
                      {format(new Date(period.to), 'dd/MM/yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom date range */}
          <div className="p-3">
            <p className="text-sm font-medium mb-2">
              Ou selecionar intervalo personalizado
            </p>
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

      {/* Category Filter */}
      <Select
        value={selectedCategory || 'all'}
        onValueChange={handleCategoryChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {filterOptions.categories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Service Filter (conditional - only shows if category is selected) */}
      {selectedCategory && (
        <Select
          value={selectedService || 'all'}
          onValueChange={handleServiceChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Serviço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os serviços</SelectItem>
            {availableServices.map((service) => (
              <SelectItem key={service} value={service}>
                {service}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear filters button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          disabled={isPending}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}

      {isPending && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">A atualizar...</span>
        </div>
      )}
    </div>
  )
}
