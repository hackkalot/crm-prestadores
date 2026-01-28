'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { ClientRegistrationTrendPoint } from '@/lib/analytics/types'

interface ClientRegistrationTrendChartProps {
  data: ClientRegistrationTrendPoint[]
}

export function ClientRegistrationTrendChart({ data }: ClientRegistrationTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução de Registos
          </CardTitle>
          <CardDescription>Novos clientes registados por mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalNew = data.reduce((sum, d) => sum + d.newClients, 0)

  // Determine if labels should be rotated based on data density
  const shouldRotate = data.length > 8
  // Calculate tick interval to avoid overcrowding
  const tickInterval = data.length > 30 ? Math.ceil(data.length / 15) - 1 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Evolução de Registos
        </CardTitle>
        <CardDescription>
          {totalNew.toLocaleString('pt-PT')} registos em {data.length} períodos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="periodLabel"
                tick={{ fontSize: 11 }}
                angle={shouldRotate ? -45 : 0}
                textAnchor={shouldRotate ? 'end' : 'middle'}
                height={shouldRotate ? 60 : 30}
                interval={tickInterval}
                className="text-muted-foreground"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm mb-1">{label}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Novos: </span>
                          <span className="font-bold text-blue-600">
                            {(payload[0].value as number).toLocaleString('pt-PT')}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Total acumulado: </span>
                          <span className="font-bold text-green-600">
                            {(payload[1].value as number).toLocaleString('pt-PT')}
                          </span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="newClients"
                fill="#3b82f6"
                opacity={0.7}
                radius={[2, 2, 0, 0]}
                name="Novos Clientes"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeTotal"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.1}
                strokeWidth={2}
                name="Total Acumulado"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
