'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { format, eachDayOfInterval, startOfYear, endOfYear, isSameDay, parseISO, differenceInDays } from 'date-fns'
import { pt } from 'date-fns/locale'

interface SyncLog {
  id: string
  status: string
  date_from: string
  date_to: string
  triggered_at: string
}

interface SyncCoverageHeatmapProps {
  logs: SyncLog[]
  startYear?: number
}

interface DayStatus {
  date: Date
  status: 'covered' | 'failed' | 'gap' | 'future'
  syncIds: string[]
}

interface Gap {
  start: Date
  end: Date
  days: number
}

export function SyncCoverageHeatmap({ logs, startYear = 2023 }: SyncCoverageHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Calculate day coverage
  const { dayStatuses, gaps, stats } = useMemo(() => {
    const today = new Date()
    const start = new Date(startYear, 0, 1) // Jan 1, startYear
    const end = today

    // Create map of all days
    const allDays = eachDayOfInterval({ start, end })
    const dayMap = new Map<string, DayStatus>()

    // Initialize all days as gaps
    allDays.forEach(date => {
      dayMap.set(format(date, 'yyyy-MM-dd'), {
        date,
        status: 'gap',
        syncIds: [],
      })
    })

    // Mark covered days from successful syncs
    logs
      .filter(log => log.status === 'success' && log.date_from && log.date_to)
      .forEach(log => {
        try {
          const syncStart = parseISO(log.date_from)
          const syncEnd = parseISO(log.date_to)
          const syncDays = eachDayOfInterval({ start: syncStart, end: syncEnd })

          syncDays.forEach(day => {
            const key = format(day, 'yyyy-MM-dd')
            const existing = dayMap.get(key)
            if (existing) {
              existing.status = 'covered'
              existing.syncIds.push(log.id)
            }
          })
        } catch (e) {
          console.error('Error parsing dates for sync:', log.id, e)
        }
      })

    // Mark days covered only by failed syncs
    logs
      .filter(log => log.status === 'failed' && log.date_from && log.date_to)
      .forEach(log => {
        try {
          const syncStart = parseISO(log.date_from)
          const syncEnd = parseISO(log.date_to)
          const syncDays = eachDayOfInterval({ start: syncStart, end: syncEnd })

          syncDays.forEach(day => {
            const key = format(day, 'yyyy-MM-dd')
            const existing = dayMap.get(key)
            if (existing && existing.status === 'gap') {
              existing.status = 'failed'
              existing.syncIds.push(log.id)
            }
          })
        } catch (e) {
          console.error('Error parsing dates for failed sync:', log.id, e)
        }
      })

    // Calculate gaps
    const dayStatusArray = Array.from(dayMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
    const foundGaps: Gap[] = []
    let gapStart: Date | null = null

    dayStatusArray.forEach((dayStatus, index) => {
      if (dayStatus.status === 'gap') {
        if (!gapStart) {
          gapStart = dayStatus.date
        }
      } else if (gapStart) {
        foundGaps.push({
          start: gapStart,
          end: dayStatusArray[index - 1].date,
          days: differenceInDays(dayStatusArray[index - 1].date, gapStart) + 1,
        })
        gapStart = null
      }
    })

    // If still in gap at end
    if (gapStart) {
      foundGaps.push({
        start: gapStart,
        end: dayStatusArray[dayStatusArray.length - 1].date,
        days: differenceInDays(dayStatusArray[dayStatusArray.length - 1].date, gapStart) + 1,
      })
    }

    // Calculate stats
    const covered = dayStatusArray.filter(d => d.status === 'covered').length
    const failed = dayStatusArray.filter(d => d.status === 'failed').length
    const gap = dayStatusArray.filter(d => d.status === 'gap').length
    const total = dayStatusArray.length

    return {
      dayStatuses: dayMap,
      gaps: foundGaps,
      stats: {
        covered,
        failed,
        gap,
        total,
        coveragePercent: total > 0 ? (covered / total) * 100 : 0,
      },
    }
  }, [logs, startYear])

  // Group days by year and month
  const yearMonthGrid = useMemo(() => {
    const grid: { year: number; months: { month: number; days: DayStatus[] }[] }[] = []
    const today = new Date()

    for (let year = startYear; year <= today.getFullYear(); year++) {
      const yearStart = startOfYear(new Date(year, 0, 1))
      const yearEnd = endOfYear(new Date(year, 11, 31))
      const yearDays = eachDayOfInterval({ start: yearStart, end: yearEnd })

      const months: { month: number; days: DayStatus[] }[] = []

      for (let month = 0; month < 12; month++) {
        const monthDays = yearDays
          .filter(day => day.getMonth() === month)
          .map(day => {
            const key = format(day, 'yyyy-MM-dd')
            return (
              dayStatuses.get(key) || {
                date: day,
                status: day > today ? ('future' as const) : ('gap' as const),
                syncIds: [],
              }
            )
          })

        months.push({ month, days: monthDays })
      }

      grid.push({ year, months })
    }

    return grid
  }, [dayStatuses, startYear])

  const getStatusColor = (status: DayStatus['status']) => {
    switch (status) {
      case 'covered':
        return 'bg-green-600 hover:bg-green-700'
      case 'failed':
        return 'bg-yellow-500 hover:bg-yellow-600'
      case 'gap':
        return 'bg-red-500 hover:bg-red-600'
      case 'future':
        return 'bg-gray-200 hover:bg-gray-300'
      default:
        return 'bg-gray-300'
    }
  }

  const getStatusLabel = (status: DayStatus['status']) => {
    switch (status) {
      case 'covered':
        return 'Coberto'
      case 'failed':
        return 'Apenas syncs falhados'
      case 'gap':
        return 'SEM COBERTURA'
      case 'future':
        return 'Futuro'
      default:
        return 'Desconhecido'
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats and Gaps Alert */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cobertura Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{stats.coveragePercent.toFixed(1)}%</span>
                <span className="text-sm text-muted-foreground">
                  de {stats.total.toLocaleString('pt-PT')} dias
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>{stats.covered.toLocaleString('pt-PT')} cobertos</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span>{stats.gap.toLocaleString('pt-PT')} sem cobertura</span>
                </div>
                {stats.failed > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    <span>{stats.failed.toLocaleString('pt-PT')} apenas failed</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {gaps.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Períodos Sem Cobertura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-xs max-h-20 overflow-y-auto">
                {gaps.slice(0, 5).map((gap, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {format(gap.start, 'dd MMM yyyy', { locale: pt })} -{' '}
                      {format(gap.end, 'dd MMM yyyy', { locale: pt })}
                    </span>
                    <Badge variant="destructive" className="text-xs">
                      {gap.days} {gap.days === 1 ? 'dia' : 'dias'}
                    </Badge>
                  </div>
                ))}
                {gaps.length > 5 && (
                  <p className="text-muted-foreground italic pt-1">
                    ... e mais {gaps.length - 5} períodos
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Calendar Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Cobertura</CardTitle>
          <CardDescription>
            Visualização da cobertura de dados por dia desde {startYear}. Verde = coberto, Vermelho = sem
            cobertura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 overflow-x-auto">
            {yearMonthGrid.map(({ year, months }) => (
              <div key={year} className="space-y-2">
                <h3 className="text-sm font-semibold">{year}</h3>
                <div className="grid grid-cols-12 gap-2">
                  {months.map(({ month, days }) => (
                    <div key={month} className="space-y-1">
                      <div className="text-xs text-muted-foreground text-center">
                        {format(new Date(year, month, 1), 'MMM', { locale: pt })}
                      </div>
                      <div className="grid grid-cols-7 gap-[2px]">
                        {days.map((dayStatus, i) => (
                          <TooltipProvider key={i}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className={`w-3 h-3 rounded-sm transition-all ${getStatusColor(
                                    dayStatus.status
                                  )}`}
                                  onClick={() => setSelectedDay(dayStatus.date)}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold">
                                    {format(dayStatus.date, 'dd MMMM yyyy', { locale: pt })}
                                  </p>
                                  <p className="text-xs">{getStatusLabel(dayStatus.status)}</p>
                                  {dayStatus.syncIds.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      {dayStatus.syncIds.length} sync{dayStatus.syncIds.length > 1 ? 's' : ''}
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-green-600" />
              <span>Coberto (sucesso)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-yellow-500" />
              <span>Apenas syncs falhados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span>Sem cobertura</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-gray-200" />
              <span>Futuro</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
