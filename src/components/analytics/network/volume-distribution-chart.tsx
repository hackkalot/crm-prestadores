'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { VolumeDistributionItem } from '@/lib/analytics/types'

interface VolumeDistributionChartProps {
  data: VolumeDistributionItem[]
}

const COLORS = [
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
]

export function VolumeDistributionChart({ data }: VolumeDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.volume, 0)

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Volume</CardTitle>
          <CardDescription>Volume de pedidos por prestador</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Convert to chart-compatible format
  const chartData = data.map((d) => ({ ...d }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição de Volume</CardTitle>
        <CardDescription>
          Top {data.length} prestadores por volume ({total.toLocaleString('pt-PT')} pedidos)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="volume"
                nameKey="providerName"
                label={({ percent }) =>
                  (percent as number) > 0.05 ? `${Math.round((percent as number) * 100)}%` : ''
                }
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as VolumeDistributionItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.providerName}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Volume: </span>
                          <span className="font-bold">{item.volume.toLocaleString('pt-PT')}</span>
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
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground truncate max-w-[100px] inline-block">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
