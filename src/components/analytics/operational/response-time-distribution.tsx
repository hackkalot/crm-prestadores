'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ANALYTICS_COLORS } from '@/lib/analytics/constants'
import type { ResponseTimeDistribution } from '@/lib/analytics/types'

interface ResponseTimeDistributionChartProps {
  data: ResponseTimeDistribution[]
}

const BUCKET_COLORS = [
  ANALYTICS_COLORS.OK,      // 0-4h
  ANALYTICS_COLORS.PRIMARY, // 4-12h
  ANALYTICS_COLORS.WARNING, // 12-24h
  ANALYTICS_COLORS.CRITICAL, // 24h+
]

export function ResponseTimeDistributionChart({ data }: ResponseTimeDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tempo de Resposta</CardTitle>
          <CardDescription>Distribuicao do tempo medio de resposta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Sem dados disponiveis
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tempo de Resposta</CardTitle>
        <CardDescription>
          Distribuicao do tempo medio de resposta dos prestadores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="bucket"
                width={60}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as ResponseTimeDistribution
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.bucket}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Prestadores: </span>
                          <span className="font-bold">{item.count}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Percentagem: </span>
                          <span className="font-bold">{item.percentage}%</span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={BUCKET_COLORS[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
