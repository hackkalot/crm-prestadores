'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UserX } from 'lucide-react'
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

interface AbandonmentByStageChartProps {
  data: Array<{
    id: string
    stage_number: string
    name: string
    abandonedCount: number
  }>
}

// Gradiente de cores (vermelho)
const GRADIENT_COLORS = [
  '#fecaca', // red-200
  '#fca5a5', // red-300
  '#f87171', // red-400
  '#ef4444', // red-500
  '#dc2626', // red-600
  '#b91c1c', // red-700
]

function getGradientColor(index: number, total: number): string {
  const colorIndex = Math.floor((index / Math.max(total - 1, 1)) * (GRADIENT_COLORS.length - 1))
  return GRADIENT_COLORS[colorIndex]
}

export function AbandonmentByStageChart({ data }: AbandonmentByStageChartProps) {
  const total = data.reduce((acc, d) => acc + d.abandonedCount, 0)

  // Preparar dados para o gráfico
  const chartData = data.map((stage, index) => ({
    ...stage,
    shortName: `E${stage.stage_number}`,
    fullName: `${stage.stage_number}. ${stage.name}`,
    fill: getGradientColor(index, data.length),
    percent: total > 0 ? Math.round((stage.abandonedCount / total) * 100) : 0,
  }))

  const hasData = data.some(d => d.abandonedCount > 0)

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: {
    active?: boolean
    payload?: Array<{ payload: typeof chartData[0] }>
  }) => {
    if (active && payload && payload.length) {
      const stage = payload[0].payload
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{stage.fullName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-bold text-destructive">{stage.abandonedCount}</span>
            <span className="text-xs text-muted-foreground">abandonos ({stage.percent}%)</span>
          </div>
        </div>
      )
    }
    return null
  }

  // Encontrar etapa com mais abandonos
  const worstStage = chartData.reduce((max, stage) =>
    stage.abandonedCount > max.abandonedCount ? stage : max
  , chartData[0])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <UserX className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Abandono por Etapa</CardTitle>
        </div>
        <CardDescription>
          Em que etapa se perde mais prestadores
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-8 text-muted-foreground">
            Sem abandonos registados por etapa.
          </div>
        ) : (
          <>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="abandonedCount" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Highlight da pior etapa */}
            {worstStage && worstStage.abandonedCount > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                  <div>
                    <p className="text-xs text-muted-foreground">Etapa crítica</p>
                    <p className="font-medium text-sm">{worstStage.fullName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-destructive">{worstStage.abandonedCount}</span>
                    <p className="text-xs text-muted-foreground">{worstStage.percent}% dos abandonos</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
