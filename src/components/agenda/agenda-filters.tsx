'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CalendarDays, List } from 'lucide-react'
import { format, addDays, addWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useState } from 'react'

interface AgendaFiltersProps {
  currentDate: string
  currentView: 'week' | 'day'
}

export function AgendaFilters({ currentDate, currentView }: AgendaFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [calendarOpen, setCalendarOpen] = useState(false)

  const date = new Date(currentDate)

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      params.set(key, value)
    })
    router.push(`/agenda?${params.toString()}`)
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = currentView === 'week'
      ? addWeeks(date, direction === 'next' ? 1 : -1)
      : addDays(date, direction === 'next' ? 1 : -1)
    updateParams({ date: format(newDate, 'yyyy-MM-dd') })
  }

  const goToToday = () => {
    updateParams({ date: format(new Date(), 'yyyy-MM-dd') })
  }

  const goToDate = (newDate: Date | undefined) => {
    if (newDate) {
      updateParams({ date: format(newDate, 'yyyy-MM-dd') })
      setCalendarOpen(false)
    }
  }

  const toggleView = (view: 'week' | 'day') => {
    updateParams({ view })
  }

  // Formatar label de periodo
  const getPeriodLabel = () => {
    if (currentView === 'day') {
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })
    }

    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 })

    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${format(weekStart, 'd')} - ${format(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: pt })}`
    }

    return `${format(weekStart, "d 'de' MMM", { locale: pt })} - ${format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: pt })}`
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card rounded-lg border p-4">
      {/* Navegacao */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoje
        </Button>

        <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="ml-2 text-lg font-medium capitalize hover:bg-accent">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {getPeriodLabel()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={goToDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Toggle de vista */}
      <div className="flex items-center gap-2 border rounded-lg p-1">
        <Button
          variant={currentView === 'week' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleView('week')}
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Semana
        </Button>
        <Button
          variant={currentView === 'day' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleView('day')}
        >
          <List className="h-4 w-4 mr-2" />
          Dia
        </Button>
      </div>
    </div>
  )
}
