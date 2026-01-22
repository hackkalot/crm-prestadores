'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import {
  X,
  Filter,
  Calendar,
  Users,
  MapPin,
  Zap,
  RotateCcw,
} from 'lucide-react'
import { useCallback, useTransition } from 'react'
import { format, parseISO, subDays, subWeeks, subMonths, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek } from 'date-fns'
import { User } from 'lucide-react'

const entityOptions = [
  { value: '_all', label: 'Todos os tipos' },
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'eni', label: 'ENI' },
  { value: 'empresa', label: 'Empresa' },
]

const onboardingTypeOptions = [
  { value: '_all', label: 'Todos' },
  { value: 'normal', label: 'Normal' },
  { value: 'urgente', label: 'Urgente' },
]

// Presets de periodo
const periodPresets = [
  { label: 'Últimos 7 dias', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Semana passada', getValue: () => ({ from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }) }) },
  { label: 'Últimos 30 dias', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'Este mês', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Mês anterior', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Este ano', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
]

interface KpiFiltersProps {
  districts: string[]
  users: { id: string; name: string; email: string }[]
}

export function KpiFilters({ districts, users }: KpiFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentEntity = searchParams.get('entityType') || ''
  const currentDistrict = searchParams.get('district') || ''
  const currentOnboardingType = searchParams.get('onboardingType') || ''
  const currentDateFrom = searchParams.get('dateFrom') || ''
  const currentDateTo = searchParams.get('dateTo') || ''
  const currentUserId = searchParams.get('userId') || ''

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== '_all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    startTransition(() => {
      router.push(`/kpis?${params.toString()}`)
    })
  }, [router, searchParams])

  const updateMultipleFilters = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '_all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    startTransition(() => {
      router.push(`/kpis?${params.toString()}`)
    })
  }, [router, searchParams])

  const applyPeriodPreset = (preset: typeof periodPresets[0]) => {
    const { from, to } = preset.getValue()
    updateMultipleFilters({
      dateFrom: format(from, 'yyyy-MM-dd'),
      dateTo: format(to, 'yyyy-MM-dd'),
    })
  }

  const clearFilters = () => {
    startTransition(() => {
      router.push('/kpis')
    })
  }

  const hasFilters = currentEntity || currentDistrict || currentOnboardingType ||
    currentDateFrom || currentDateTo || currentUserId

  const activeFilterCount = [
    currentEntity,
    currentDistrict,
    currentOnboardingType,
    currentDateFrom || currentDateTo ? 'date' : '',
    currentUserId,
  ].filter(Boolean).length

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Filtros</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              disabled={isPending}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Quick Period Presets */}
        <div className="flex flex-wrap gap-2">
          {periodPresets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => applyPeriodPreset(preset)}
              disabled={isPending}
              className="h-7 text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Date Range */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Periodo
            </label>
            <div className="flex items-center gap-2">
              <DatePicker
                value={currentDateFrom ? parseISO(currentDateFrom) : null}
                onChange={(date) => updateFilter('dateFrom', date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="Data inicio"
                disabled={isPending}
                toDate={currentDateTo ? parseISO(currentDateTo) : undefined}
                className="flex-1"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <DatePicker
                value={currentDateTo ? parseISO(currentDateTo) : null}
                onChange={(date) => updateFilter('dateTo', date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="Data fim"
                disabled={isPending}
                fromDate={currentDateFrom ? parseISO(currentDateFrom) : undefined}
                className="flex-1"
              />
            </div>
          </div>

          {/* Entity Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Tipo de Parceiro
            </label>
            <Select
              value={currentEntity || '_all'}
              onValueChange={(value) => updateFilter('entityType', value)}
              disabled={isPending}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* District */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Zona
            </label>
            <Select
              value={currentDistrict || '_all'}
              onValueChange={(value) => updateFilter('district', value)}
              disabled={isPending}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas as zonas</SelectItem>
                {districts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Onboarding Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Tipo Onboarding
            </label>
            <Select
              value={currentOnboardingType || '_all'}
              onValueChange={(value) => updateFilter('onboardingType', value)}
              disabled={isPending}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {onboardingTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              Utilizador
            </label>
            <Select
              value={currentUserId || '_all'}
              onValueChange={(value) => updateFilter('userId', value)}
              disabled={isPending}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">Filtros ativos:</span>
            {currentDateFrom && currentDateTo && (
              <Badge variant="secondary" className="gap-1 pr-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(currentDateFrom), 'dd/MM/yy')} - {format(parseISO(currentDateTo), 'dd/MM/yy')}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => updateMultipleFilters({ dateFrom: '', dateTo: '' })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {currentDateFrom && !currentDateTo && (
              <Badge variant="secondary" className="gap-1 pr-1">
                <Calendar className="h-3 w-3" />
                Desde {format(parseISO(currentDateFrom), 'dd/MM/yy')}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => updateFilter('dateFrom', '')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {!currentDateFrom && currentDateTo && (
              <Badge variant="secondary" className="gap-1 pr-1">
                <Calendar className="h-3 w-3" />
                Ate {format(parseISO(currentDateTo), 'dd/MM/yy')}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => updateFilter('dateTo', '')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {currentEntity && (
              <Badge variant="secondary" className="gap-1 pr-1">
                <Users className="h-3 w-3" />
                {entityOptions.find(o => o.value === currentEntity)?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => updateFilter('entityType', '')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {currentDistrict && (
              <Badge variant="secondary" className="gap-1 pr-1">
                <MapPin className="h-3 w-3" />
                {currentDistrict}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => updateFilter('district', '')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {currentOnboardingType && (
              <Badge variant="secondary" className="gap-1 pr-1">
                <Zap className="h-3 w-3" />
                {onboardingTypeOptions.find(o => o.value === currentOnboardingType)?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => updateFilter('onboardingType', '')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {currentUserId && (
              <Badge variant="secondary" className="gap-1 pr-1">
                <User className="h-3 w-3" />
                {users.find(u => u.id === currentUserId)?.name || 'Utilizador'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => updateFilter('userId', '')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
