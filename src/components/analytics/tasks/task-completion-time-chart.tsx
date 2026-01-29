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
import type { TaskCompletionTimeItem } from '@/lib/analytics/types'

// Gradient colors from dark to light (cyan)
const COLORS = [
  '#06b6d4', // cyan-500
  '#22d3ee', // cyan-400
  '#67e8f9', // cyan-300
  '#a5f3fc', // cyan-200
  '#cffafe', // cyan-100
  '#ecfeff', // cyan-50
]

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

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-base">Tempo de Conclusão por Tipo</CardTitle>
        <CardDescription>
          Média de dias para concluir cada tipo de tarefa
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="h-full min-h-[250px]">
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
                radius={[0, 4, 4, 0]}
                name="Dias médios"
              >
                {data.map((_, index) => (
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
