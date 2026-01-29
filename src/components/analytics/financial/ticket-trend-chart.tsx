'use client'

import { useMemo, useId } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { TicketTrendPoint, TrendData, TrendGranularity } from '@/lib/analytics/types'

// Colors for the chart
const CHART_COLORS = {
  aboveAverage: '#3b82f6', // blue-500
  belowAverage: '#f97316', // orange-500
  averageLine: '#94a3b8',  // slate-400
}

interface TicketTrendChartProps {
  data: TrendData<TicketTrendPoint>
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getGranularityLabel(granularity: TrendGranularity): string {
  switch (granularity) {
    case 'day':
      return 'diária'
    case 'week':
      return 'semanal'
    case 'month':
      return 'mensal'
  }
}

export function TicketTrendChart({ data }: TicketTrendChartProps) {
  const { granularity, data: trendData } = data
  const uniqueId = useId().replace(/:/g, '')

  // Calculate average ticket (safe for empty array)
  const avgTicket = trendData.length > 0
    ? trendData.reduce((sum, d) => sum + d.avgTicket, 0) / trendData.length
    : 0

  // Prepare chart data with separate values for above/below lines
  // Each point will have either aboveValue or belowValue (not both)
  // We include interpolated crossing points for smooth transitions
  const chartData = useMemo(() => {
    if (trendData.length === 0) return []

    const result: Array<{
      periodLabel: string
      avgTicket: number
      totalRevenue: number
      count: number
      aboveValue: number | null
      belowValue: number | null
      isAbove: boolean
    }> = []

    for (let i = 0; i < trendData.length; i++) {
      const point = trendData[i]
      const isAbove = point.avgTicket >= avgTicket

      // Check if we need to add a crossing point between this and previous
      if (i > 0) {
        const prevPoint = trendData[i - 1]
        const prevIsAbove = prevPoint.avgTicket >= avgTicket

        // If crossed the average line, add interpolated crossing point
        if (isAbove !== prevIsAbove) {
          // Calculate where the line crosses the average
          const t = (avgTicket - prevPoint.avgTicket) / (point.avgTicket - prevPoint.avgTicket)
          result.push({
            periodLabel: '', // Invisible label for crossing point
            avgTicket: avgTicket,
            totalRevenue: prevPoint.totalRevenue + t * (point.totalRevenue - prevPoint.totalRevenue),
            count: Math.round(prevPoint.count + t * (point.count - prevPoint.count)),
            aboveValue: avgTicket,
            belowValue: avgTicket,
            isAbove: isAbove,
          })
        }
      }

      // Add the actual data point
      result.push({
        ...point,
        aboveValue: isAbove ? point.avgTicket : null,
        belowValue: !isAbove ? point.avgTicket : null,
        isAbove,
      })
    }

    return result
  }, [trendData, avgTicket])

  // Empty state
  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Ticket Médio</CardTitle>
          <CardDescription>Tendência do valor médio por processo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Single point state - show summary instead of chart
  if (trendData.length === 1) {
    const point = trendData[0]
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Ticket Médio</CardTitle>
          <CardDescription>
            Período: {point.periodLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[250px] space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Apenas 1 período no intervalo selecionado.
              <br />
              Selecione um período maior para ver a tendência.
            </p>
            <div className="text-center">
              <p className="text-3xl font-bold">{formatCurrency(point.avgTicket)}</p>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span>Revenue: {formatCurrency(point.totalRevenue)}</span>
              <span>Processos: {point.count}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Evolução Ticket Médio</CardTitle>
            <CardDescription>
              Tendência {getGranularityLabel(granularity)} · Média: {formatCurrency(avgTicket)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.aboveAverage }} />
              <span className="text-muted-foreground">Acima da média</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.belowAverage }} />
              <span className="text-muted-foreground">Abaixo da média</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="h-full min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <ComposedChart data={chartData}>
              <defs>
                {/* Gradient for area above average (blue) */}
                <linearGradient id={`gradientAbove-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.aboveAverage} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS.aboveAverage} stopOpacity={0.05} />
                </linearGradient>
                {/* Gradient for area below average (orange) */}
                <linearGradient id={`gradientBelow-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.belowAverage} stopOpacity={0.05} />
                  <stop offset="100%" stopColor={CHART_COLORS.belowAverage} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="periodLabel"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                interval={granularity === 'day' && trendData.length > 15 ? 'preserveStartEnd' : 0}
                angle={granularity === 'day' && trendData.length > 10 ? -45 : 0}
                textAnchor={granularity === 'day' && trendData.length > 10 ? 'end' : 'middle'}
                height={granularity === 'day' && trendData.length > 10 ? 60 : 30}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(v) => `${v}€`}
                axisLine={false}
                tickLine={false}
                width={50}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as TicketTrendPoint & { isAbove: boolean }
                    const isAbove = item.isAbove
                    const diff = item.avgTicket - avgTicket
                    const diffPercent = avgTicket > 0 ? (diff / avgTicket) * 100 : 0
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[200px]">
                        <p className="font-medium text-sm mb-2 border-b pb-2">{label}</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground text-sm">Ticket Médio</span>
                            <span className={`font-bold text-sm`} style={{ color: isAbove ? CHART_COLORS.aboveAverage : CHART_COLORS.belowAverage }}>
                              {formatCurrency(item.avgTicket)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground text-sm">vs Média</span>
                            <span className={`font-medium text-sm`} style={{ color: isAbove ? CHART_COLORS.aboveAverage : CHART_COLORS.belowAverage }}>
                              {diff >= 0 ? '+' : ''}{formatCurrency(diff)} ({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="border-t pt-2 mt-2 space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground text-xs">Revenue</span>
                              <span className="font-medium text-xs">{formatCurrency(item.totalRevenue)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground text-xs">Processos</span>
                              <span className="font-medium text-xs">{item.count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              {/* Area fill for values above average (blue) */}
              <Area
                type="monotone"
                dataKey="aboveValue"
                stroke="none"
                fill={`url(#gradientAbove-${uniqueId})`}
                baseValue={avgTicket}
                connectNulls={false}
                isAnimationActive={false}
              />
              {/* Area fill for values below average (orange) */}
              <Area
                type="monotone"
                dataKey="belowValue"
                stroke="none"
                fill={`url(#gradientBelow-${uniqueId})`}
                baseValue={avgTicket}
                connectNulls={false}
                isAnimationActive={false}
              />
              {/* Line for values above average (blue) */}
              <Line
                type="monotone"
                dataKey="aboveValue"
                stroke={CHART_COLORS.aboveAverage}
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              {/* Line for values below average (orange) */}
              <Line
                type="monotone"
                dataKey="belowValue"
                stroke={CHART_COLORS.belowAverage}
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              {/* Average reference line (horizontal) */}
              <ReferenceLine
                y={avgTicket}
                stroke={CHART_COLORS.averageLine}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: `Média: ${Math.round(avgTicket)}€`,
                  position: 'right',
                  fill: CHART_COLORS.averageLine,
                  fontSize: 11,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
