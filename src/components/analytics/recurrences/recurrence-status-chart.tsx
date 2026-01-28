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
import type { RecurrenceStatusItem } from '@/lib/analytics/types'

interface RecurrenceStatusChartProps {
  data: RecurrenceStatusItem[]
}

const STATUS_COLORS: Record<string, string> = {
  'Ativa': '#22c55e',
  'Active': '#22c55e',
  'Inativa': '#ef4444',
  'Inactive': '#ef4444',
  'Desconhecido': '#94a3b8',
}

const DEFAULT_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4']

export function RecurrenceStatusChart({ data }: RecurrenceStatusChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status das Recorrências</CardTitle>
          <CardDescription>Distribuição por estado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(d => ({ ...d }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status das Recorrências</CardTitle>
        <CardDescription>
          {total.toLocaleString('pt-PT')} recorrências em {data.length} estados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                nameKey="status"
                label={({ percent }: { percent?: number }) =>
                  percent && percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as RecurrenceStatusItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.status}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Total: </span>
                          <span className="font-bold">{item.count.toLocaleString('pt-PT')}</span>
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
                formatter={(value: string) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
