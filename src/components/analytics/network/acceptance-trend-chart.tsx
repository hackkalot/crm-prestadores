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
  Legend,
} from 'recharts'
import { ANALYTICS_COLORS } from '@/lib/analytics/constants'
import type { AcceptanceTrendPoint, TrendData, TrendGranularity } from '@/lib/analytics/types'

interface AcceptanceTrendChartProps {
  data: TrendData<AcceptanceTrendPoint>
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

export function AcceptanceTrendChart({ data }: AcceptanceTrendChartProps) {
  const { granularity, data: trendData } = data

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendência de Aceitação</CardTitle>
          <CardDescription>Evolução da taxa de aceitação e expiração</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Se há apenas 1 ponto, mostrar resumo em vez de gráfico de linha
  if (trendData.length === 1) {
    const point = trendData[0]
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendência de Aceitação</CardTitle>
          <CardDescription>
            Período: {point.periodLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[250px] space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Apenas 1 período de alocação no intervalo selecionado.
              <br />
              Selecione um período maior para ver a tendência.
            </p>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{point.acceptanceRate}%</p>
                <p className="text-sm text-muted-foreground">Taxa Aceitação</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{point.expirationRate}%</p>
                <p className="text-sm text-muted-foreground">Taxa Expiração</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {point.totalReceived.toLocaleString('pt-PT')} pedidos recebidos
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tendência de Aceitação</CardTitle>
        <CardDescription>
          Evolução {getGranularityLabel(granularity)} da taxa de aceitação e expiração
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="periodLabel"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                interval={trendData.length > 12 ? 'preserveStartEnd' : 0}
                angle={trendData.length > 8 ? -45 : 0}
                textAnchor={trendData.length > 8 ? 'end' : 'middle'}
                height={trendData.length > 8 ? 60 : 30}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as AcceptanceTrendPoint
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm mb-2">{label}</p>
                        {payload.map((item) => (
                          <p key={item.name} className="text-sm">
                            <span
                              className="inline-block w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-muted-foreground">
                              {item.name === 'acceptanceRate' ? 'Aceitação' : 'Expiração'}:{' '}
                            </span>
                            <span className="font-bold">{item.value}%</span>
                          </p>
                        ))}
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          {point.totalReceived.toLocaleString('pt-PT')} pedidos recebidos
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend
                formatter={(value) =>
                  value === 'acceptanceRate' ? 'Taxa Aceitação' : 'Taxa Expiração'
                }
              />
              <Line
                type="monotone"
                dataKey="acceptanceRate"
                stroke={ANALYTICS_COLORS.OK}
                strokeWidth={2}
                dot={trendData.length <= 15 ? { fill: ANALYTICS_COLORS.OK, strokeWidth: 2 } : false}
              />
              <Line
                type="monotone"
                dataKey="expirationRate"
                stroke={ANALYTICS_COLORS.CRITICAL}
                strokeWidth={2}
                dot={trendData.length <= 15 ? { fill: ANALYTICS_COLORS.CRITICAL, strokeWidth: 2 } : false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
