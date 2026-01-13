'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ANALYTICS_COLORS } from '@/lib/analytics/constants'
import type { TicketTrendPoint, TrendData, TrendGranularity } from '@/lib/analytics/types'

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

  // Calculate average ticket
  const avgTicket = trendData.reduce((sum, d) => sum + d.avgTicket, 0) / trendData.length
  const totalRevenue = trendData.reduce((sum, d) => sum + d.totalRevenue, 0)
  const totalCount = trendData.reduce((sum, d) => sum + d.count, 0)

  // Se há apenas 1 ponto, mostrar resumo em vez de gráfico de linha
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evolução Ticket Médio</CardTitle>
        <CardDescription>
          Tendência {getGranularityLabel(granularity)} - Média: {formatCurrency(avgTicket)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="periodLabel"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                interval={granularity === 'day' && trendData.length > 15 ? 'preserveStartEnd' : 0}
                angle={granularity === 'day' && trendData.length > 10 ? -45 : 0}
                textAnchor={granularity === 'day' && trendData.length > 10 ? 'end' : 'middle'}
                height={granularity === 'day' && trendData.length > 10 ? 60 : 30}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(v) => `${v}€`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as TicketTrendPoint
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Ticket Médio: </span>
                          <span className="font-bold">{formatCurrency(item.avgTicket)}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Revenue Total: </span>
                          <span className="font-bold">{formatCurrency(item.totalRevenue)}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Processos: </span>
                          <span className="font-bold">{item.count}</span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                type="monotone"
                dataKey="avgTicket"
                stroke={ANALYTICS_COLORS.PRIMARY}
                strokeWidth={2}
                dot={trendData.length <= 15 ? { fill: ANALYTICS_COLORS.PRIMARY, strokeWidth: 2 } : false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
