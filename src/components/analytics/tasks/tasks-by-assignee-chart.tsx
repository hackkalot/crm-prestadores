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
  Legend,
} from 'recharts'
import type { TaskAssigneeItem } from '@/lib/analytics/types'

interface TasksByAssigneeChartProps {
  data: TaskAssigneeItem[]
}

export function TasksByAssigneeChart({ data }: TasksByAssigneeChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarefas por Colaborador</CardTitle>
          <CardDescription>Top colaboradores por volume de tarefas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalTasks = data.reduce((sum, d) => sum + d.total, 0)
  const chartHeight = Math.max(250, data.length * 32)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tarefas por Colaborador</CardTitle>
        <CardDescription>
          {totalTasks.toLocaleString('pt-PT')} tarefas entre {data.length} colaboradores
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
                dataKey="assignee"
                type="category"
                width={140}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as TaskAssigneeItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.assignee}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Total: </span>
                          <span className="font-bold">{item.total.toLocaleString('pt-PT')}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Concluídas: </span>
                          <span className="font-bold text-green-600">{item.completed.toLocaleString('pt-PT')}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Pendentes: </span>
                          <span className="font-bold text-amber-600">{item.pending.toLocaleString('pt-PT')}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Taxa conclusão: </span>
                          <span className="font-bold">{item.completionRate}%</span>
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
              <Bar
                dataKey="completed"
                stackId="a"
                fill="#22c55e"
                name="Concluídas"
              />
              <Bar
                dataKey="pending"
                stackId="a"
                fill="#f59e0b"
                radius={[0, 4, 4, 0]}
                name="Pendentes"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
