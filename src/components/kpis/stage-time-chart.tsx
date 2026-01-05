'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Clock } from 'lucide-react'

interface StageTimeChartProps {
  data: Array<{
    id: string
    stage_number: string
    name: string
    averageHours: number
    count: number
  }>
}

export function StageTimeChart({ data }: StageTimeChartProps) {
  const maxHours = Math.max(...data.map((d) => d.averageHours), 1)

  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}min`
    if (hours < 24) return `${Math.round(hours)}h`
    const days = hours / 24
    return `${Math.round(days * 10) / 10}d`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Tempo Medio por Etapa</CardTitle>
        </div>
        <CardDescription>
          Quanto tempo os cards passam em cada etapa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((stage) => (
            <div key={stage.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {stage.stage_number}
                  </span>
                  <span className="font-medium">{stage.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {stage.count} cards
                  </span>
                  <span className="font-semibold">
                    {formatTime(stage.averageHours)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/80 rounded-full transition-all"
                  style={{
                    width: `${(stage.averageHours / maxHours) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}

          {data.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Sem dados suficientes
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
