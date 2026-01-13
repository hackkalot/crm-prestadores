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
  ReferenceLine,
} from 'recharts'
import { ANALYTICS_COLORS } from '@/lib/analytics/constants'
import type { RatingTrendPoint, TrendData, TrendGranularity } from '@/lib/analytics/types'

interface RatingTrendChartProps {
  data: TrendData<RatingTrendPoint>
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

export function RatingTrendChart({ data }: RatingTrendChartProps) {
  const { granularity, data: trendData } = data

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Rating</CardTitle>
          <CardDescription>Tendência das avaliações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const networkAvg = trendData.length > 0 ? trendData[trendData.length - 1].networkAvgRating : 0
  const totalRatings = trendData.reduce((sum, d) => sum + d.totalRatings, 0)

  // Se há apenas 1 ponto, mostrar resumo em vez de gráfico de linha
  if (trendData.length === 1) {
    const point = trendData[0]
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Rating</CardTitle>
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
              <p className="text-3xl font-bold">{point.avgRating} / 5</p>
              <p className="text-sm text-muted-foreground">Rating Médio</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {point.totalRatings.toLocaleString('pt-PT')} avaliações
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evolução Rating</CardTitle>
        <CardDescription>
          Tendência {getGranularityLabel(granularity)} | {totalRatings.toLocaleString('pt-PT')} avaliações | Média: {networkAvg}
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
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as RatingTrendPoint
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Rating Médio: </span>
                          <span className="font-bold">{item.avgRating} / 5</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Avaliações: </span>
                          <span className="font-bold">{item.totalRatings}</span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <ReferenceLine
                y={networkAvg}
                stroke={ANALYTICS_COLORS.MUTED}
                strokeDasharray="5 5"
                label={{
                  value: 'Média',
                  position: 'right',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="avgRating"
                stroke={ANALYTICS_COLORS.SECONDARY}
                strokeWidth={2}
                dot={trendData.length <= 15 ? { fill: ANALYTICS_COLORS.SECONDARY, strokeWidth: 2 } : false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
