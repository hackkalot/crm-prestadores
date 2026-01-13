'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { ANALYTICS_COLORS } from '@/lib/analytics/constants'
import type { CompletionTrendPoint, TrendData, TrendGranularity } from '@/lib/analytics/types'

interface CompletionTrendChartProps {
  data: TrendData<CompletionTrendPoint>
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

export function CompletionTrendChart({ data }: CompletionTrendChartProps) {
  const { granularity, data: trendData } = data

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Concluídos vs Cancelados</CardTitle>
          <CardDescription>Evolução do estado dos pedidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate totals
  const totalCompleted = trendData.reduce((sum, d) => sum + d.completed, 0)
  const totalCancelled = trendData.reduce((sum, d) => sum + d.cancelled, 0)
  const totalPending = trendData.reduce((sum, d) => sum + d.pending, 0)
  const total = totalCompleted + totalCancelled + totalPending

  // Single point handling
  if (trendData.length === 1) {
    const point = trendData[0]
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Concluídos vs Cancelados</CardTitle>
          <CardDescription>Período: {point.periodLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Apenas 1 período no intervalo selecionado.
              <br />
              Selecione um período maior para ver a tendência.
            </p>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{point.completed}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{point.cancelled}</p>
                <p className="text-sm text-muted-foreground">Cancelados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{point.pending}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Concluídos vs Cancelados
        </CardTitle>
        <CardDescription>
          Evolução {getGranularityLabel(granularity)} | Total: {total.toLocaleString('pt-PT')} pedidos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="periodLabel"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                interval={trendData.length > 12 ? 'preserveStartEnd' : 0}
                angle={trendData.length > 8 ? -45 : 0}
                textAnchor={trendData.length > 8 ? 'end' : 'middle'}
                height={trendData.length > 8 ? 60 : 30}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as CompletionTrendPoint
                    const periodTotal = point.completed + point.cancelled + point.pending
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm mb-2">{label}</p>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: ANALYTICS_COLORS.OK }} />
                            <span className="text-muted-foreground">Concluídos: </span>
                            <span className="font-bold">{point.completed}</span>
                            <span className="text-muted-foreground"> ({point.completionRate}%)</span>
                          </p>
                          <p>
                            <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: ANALYTICS_COLORS.CRITICAL }} />
                            <span className="text-muted-foreground">Cancelados: </span>
                            <span className="font-bold">{point.cancelled}</span>
                            <span className="text-muted-foreground"> ({point.cancellationRate}%)</span>
                          </p>
                          <p>
                            <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: ANALYTICS_COLORS.WARNING }} />
                            <span className="text-muted-foreground">Pendentes: </span>
                            <span className="font-bold">{point.pending}</span>
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          Total: {periodTotal.toLocaleString('pt-PT')}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend
                formatter={(value) => {
                  if (value === 'completed') return 'Concluídos'
                  if (value === 'cancelled') return 'Cancelados'
                  if (value === 'pending') return 'Pendentes'
                  return value
                }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stackId="1"
                stroke={ANALYTICS_COLORS.OK}
                fill={ANALYTICS_COLORS.OK}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="cancelled"
                stackId="1"
                stroke={ANALYTICS_COLORS.CRITICAL}
                fill={ANALYTICS_COLORS.CRITICAL}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="pending"
                stackId="1"
                stroke={ANALYTICS_COLORS.WARNING}
                fill={ANALYTICS_COLORS.WARNING}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
