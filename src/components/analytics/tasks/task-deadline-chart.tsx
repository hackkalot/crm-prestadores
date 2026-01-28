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
import { Clock } from 'lucide-react'
import type { TaskDeadlineComplianceItem } from '@/lib/analytics/types'

interface TaskDeadlineChartProps {
  data: TaskDeadlineComplianceItem[]
}

export function TaskDeadlineChart({ data }: TaskDeadlineChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Cumprimento de Prazos
          </CardTitle>
          <CardDescription>Finishing date vs deadline das tarefas concluidas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalTasks = data.reduce((sum, d) => sum + d.count, 0)
  const onTime = data
    .filter(d => d.bucket.includes('Antes') || d.bucket.includes('No prazo'))
    .reduce((sum, d) => sum + d.count, 0)
  const onTimePercentage = totalTasks > 0 ? Math.round((onTime / totalTasks) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Cumprimento de Prazos
        </CardTitle>
        <CardDescription>
          {onTimePercentage}% das tarefas concluidas dentro do prazo ({onTime.toLocaleString('pt-PT')} de {totalTasks.toLocaleString('pt-PT')})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 10 }}
                angle={-20}
                textAnchor="end"
                height={60}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as TaskDeadlineComplianceItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{item.bucket}</p>
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
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tarefas">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
