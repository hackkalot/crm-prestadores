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
} from 'recharts'
import { ANALYTICS_COLORS } from '@/lib/analytics/constants'
import type { RevenueByCategoryItem } from '@/lib/analytics/types'

interface RevenueByCategoryChartProps {
  data: RevenueByCategoryItem[]
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`
  }
  return value.toFixed(0)
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function RevenueByCategoryChart({ data }: RevenueByCategoryChartProps) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0)

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue por Categoria</CardTitle>
          <CardDescription>Distribuicao de receita por tipo de servico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Sem dados disponiveis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Truncate category names for display
  const chartData = data.map((d) => ({
    ...d,
    displayCategory: d.category.length > 25 ? d.category.substring(0, 22) + '...' : d.category,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue por Categoria</CardTitle>
        <CardDescription>
          Total: {formatCurrencyFull(total)}
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
                tickFormatter={formatCurrency}
              />
              <YAxis
                type="category"
                dataKey="displayCategory"
                width={120}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as RevenueByCategoryItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.category}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Revenue: </span>
                          <span className="font-bold">{formatCurrencyFull(item.revenue)}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Processos: </span>
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
              <Bar dataKey="revenue" fill={ANALYTICS_COLORS.REVENUE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
