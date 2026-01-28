'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import { Layers } from 'lucide-react'
import type { TaskTrendPoint } from '@/lib/analytics/types'

interface TaskTrendChartProps {
  data: TaskTrendPoint[]
}

export function TaskTrendChart({ data }: TaskTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Tarefas Acumuladas
          </CardTitle>
          <CardDescription>Evolução do backlog de tarefas ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const lastPoint = data[data.length - 1]
  const shouldRotate = data.length > 8
  const tickInterval = data.length > 30 ? Math.ceil(data.length / 15) - 1 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Tarefas Acumuladas
        </CardTitle>
        <CardDescription>
          {lastPoint.cumulativeCompleted.toLocaleString('pt-PT')} concluídas, {lastPoint.openBacklog.toLocaleString('pt-PT')} em aberto de {lastPoint.cumulativeCreated.toLocaleString('pt-PT')} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="periodLabel"
                tick={{ fontSize: 11 }}
                angle={shouldRotate ? -45 : 0}
                textAnchor={shouldRotate ? 'end' : 'middle'}
                height={shouldRotate ? 60 : 30}
                interval={tickInterval}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as TaskTrendPoint
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm mb-1">{label}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Concluídas (acum.): </span>
                          <span className="font-bold text-green-600">
                            {point.cumulativeCompleted.toLocaleString('pt-PT')}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Em aberto: </span>
                          <span className="font-bold text-amber-600">
                            {point.openBacklog.toLocaleString('pt-PT')}
                          </span>
                        </p>
                        <p className="text-sm border-t mt-1 pt-1">
                          <span className="text-muted-foreground">Total criadas: </span>
                          <span className="font-bold">
                            {point.cumulativeCreated.toLocaleString('pt-PT')}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          +{point.newTasks} criadas, +{point.completedTasks} concluídas neste período
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulativeCompleted"
                stackId="1"
                fill="#22c55e"
                fillOpacity={0.3}
                stroke="#22c55e"
                strokeWidth={2}
                name="Concluídas"
              />
              <Area
                type="monotone"
                dataKey="openBacklog"
                stackId="1"
                fill="#f59e0b"
                fillOpacity={0.3}
                stroke="#f59e0b"
                strokeWidth={2}
                name="Em aberto"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
