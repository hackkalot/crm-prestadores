'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ProviderMetricItem } from '@/lib/analytics/types'

interface AdditionalVisitsByProviderChartProps {
  data: ProviderMetricItem[]
}

const COLORS = [
  '#8b5cf6', // violet-500
  '#a78bfa', // violet-400
  '#c4b5fd', // violet-300
  '#ddd6fe', // violet-200
  '#ede9fe', // violet-100
  '#f5f3ff', // violet-50
]

export function AdditionalVisitsByProviderChart({ data }: AdditionalVisitsByProviderChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visitas Adicionais por Prestador</CardTitle>
          <CardDescription>Top prestadores com mais visitas adicionais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Sem visitas adicionais no período
          </div>
        </CardContent>
      </Card>
    )
  }

  // Truncate provider names for display
  const chartData = data.map((d) => ({
    ...d,
    shortName: d.providerName.length > 20 ? d.providerName.substring(0, 20) + '...' : d.providerName,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visitas Adicionais por Prestador</CardTitle>
        <CardDescription>
          Top {data.length} prestadores ({total.toLocaleString('pt-PT')} visitas adicionais)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="shortName"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as ProviderMetricItem & { shortName: string }
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.providerName}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Visitas adicionais: </span>
                          <span className="font-bold">{item.count.toLocaleString('pt-PT')}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">% do total: </span>
                          <span className="font-bold">{item.percentage}%</span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[Math.min(index, COLORS.length - 1)]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
