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
import type { ClientPlatformItem } from '@/lib/analytics/types'

interface ClientPlatformChartProps {
  data: ClientPlatformItem[]
}

const PLATFORM_COLORS: Record<string, string> = {
  'iOS': '#3b82f6',
  'Android': '#22c55e',
  'Web': '#f59e0b',
  'web': '#f59e0b',
  'ios': '#3b82f6',
  'android': '#22c55e',
  'Desconhecido': '#94a3b8',
}

const FALLBACK_COLORS = [
  '#8b5cf6', '#06b6d4', '#ec4899', '#f97316',
]

export function ClientPlatformChart({ data }: ClientPlatformChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plataforma de Registo</CardTitle>
          <CardDescription>Distribuição por plataforma de registo</CardDescription>
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
        <CardTitle className="text-base">Plataforma de Registo</CardTitle>
        <CardDescription>
          {total.toLocaleString('pt-PT')} clientes por plataforma
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
                nameKey="platform"
                label={({ percent }) =>
                  (percent as number) > 0.05 ? `${Math.round((percent as number) * 100)}%` : ''
                }
              >
                {data.map((item, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PLATFORM_COLORS[item.platform] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as ClientPlatformItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.platform}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Clientes: </span>
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
