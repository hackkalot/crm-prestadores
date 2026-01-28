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
import type { TaskProviderItem } from '@/lib/analytics/types'

interface TasksByProviderChartProps {
  data: TaskProviderItem[]
}

export function TasksByProviderChart({ data }: TasksByProviderChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarefas por Prestador</CardTitle>
          <CardDescription>Top prestadores com mais tarefas associadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, d) => sum + d.count, 0)
  const chartHeight = Math.max(250, data.length * 28)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tarefas por Prestador</CardTitle>
        <CardDescription>
          {total.toLocaleString('pt-PT')} tarefas entre {data.length} prestadores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis
                dataKey="provider"
                type="category"
                width={160}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as TaskProviderItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.provider}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Tarefas: </span>
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
              <Bar
                dataKey="count"
                fill="#f59e0b"
                radius={[0, 4, 4, 0]}
                name="Tarefas"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
