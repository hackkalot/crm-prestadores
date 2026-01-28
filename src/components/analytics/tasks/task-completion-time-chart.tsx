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
import type { TaskCompletionTimeItem } from '@/lib/analytics/types'

interface TaskCompletionTimeChartProps {
  data: TaskCompletionTimeItem[]
}

export function TaskCompletionTimeChart({ data }: TaskCompletionTimeChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tempo de Conclusão por Tipo</CardTitle>
          <CardDescription>Média de dias para concluir cada tipo de tarefa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartHeight = Math.max(250, data.length * 32)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tempo de Conclusão por Tipo</CardTitle>
        <CardDescription>
          Média de dias para concluir cada tipo de tarefa
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
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                label={{ value: 'dias', position: 'insideBottomRight', offset: -5, fontSize: 11 }}
              />
              <YAxis
                dataKey="taskType"
                type="category"
                width={160}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as TaskCompletionTimeItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.taskType}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Média: </span>
                          <span className="font-bold">{item.avgDays} dias</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Tarefas concluídas: </span>
                          <span className="font-bold">{item.count.toLocaleString('pt-PT')}</span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="avgDays"
                fill="#06b6d4"
                radius={[0, 4, 4, 0]}
                name="Dias médios"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
