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
import type { CompletionByCategoryItem } from '@/lib/analytics/types'

interface CompletionByCategoryChartProps {
  data: CompletionByCategoryItem[]
}

function getCompletionColor(rate: number): string {
  if (rate >= 80) return ANALYTICS_COLORS.OK
  if (rate >= 60) return ANALYTICS_COLORS.WARNING
  return ANALYTICS_COLORS.CRITICAL
}

export function CompletionByCategoryChart({ data }: CompletionByCategoryChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Taxa de Conclusao</CardTitle>
          <CardDescription>Taxa de conclusao por categoria de servico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Sem dados disponiveis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Truncate category names and limit to top 8
  const chartData = data.slice(0, 8).map((d) => ({
    ...d,
    displayCategory: d.category.length > 20 ? d.category.substring(0, 17) + '...' : d.category,
  }))

  // Calculate overall completion rate
  const totalRequests = data.reduce((sum, d) => sum + d.totalRequests, 0)
  const totalCompleted = data.reduce((sum, d) => sum + d.completedRequests, 0)
  const overallRate = totalRequests > 0 ? Math.round((totalCompleted / totalRequests) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Taxa de Conclusao</CardTitle>
        <CardDescription>
          Taxa geral: {overallRate}% ({totalCompleted.toLocaleString('pt-PT')} de {totalRequests.toLocaleString('pt-PT')})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="displayCategory"
                width={110}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as CompletionByCategoryItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.category}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Taxa Conclusao: </span>
                          <span className="font-bold">{item.completionRate}%</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Concluidos: </span>
                          <span className="font-bold">{item.completedRequests}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Total: </span>
                          <span className="font-bold">{item.totalRequests}</span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="completionRate" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getCompletionColor(entry.completionRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
