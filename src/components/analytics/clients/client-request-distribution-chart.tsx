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
import type { ClientRequestBucket } from '@/lib/analytics/types'

interface ClientRequestDistributionChartProps {
  data: ClientRequestBucket[]
}

const BUCKET_COLORS = [
  '#94a3b8', // 0 - slate
  '#3b82f6', // 1 - blue
  '#22c55e', // 2-5 - green
  '#8b5cf6', // 6-10 - violet
  '#f59e0b', // 11-20 - amber
  '#ef4444', // 21+ - red
]

export function ClientRequestDistributionChart({ data }: ClientRequestDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Pedidos</CardTitle>
          <CardDescription>Clientes por faixa de pedidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(d => ({
    ...d,
    label: `${d.bucket} pedidos`,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição de Pedidos</CardTitle>
        <CardDescription>
          {total.toLocaleString('pt-PT')} clientes por faixa de pedidos realizados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis
                type="category"
                dataKey="bucket"
                width={50}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as ClientRequestBucket
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.bucket} pedidos</p>
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
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={BUCKET_COLORS[index % BUCKET_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
