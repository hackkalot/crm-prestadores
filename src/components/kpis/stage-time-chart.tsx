'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Clock } from 'lucide-react'
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

interface StageTimeChartProps {
  data: Array<{
    id: string
    stage_number: string
    name: string
    normalHours: number
    urgenteHours: number
    normalCount: number
    urgenteCount: number
  }>
}

const COLORS = {
  normal: '#3b82f6',   // blue-500
  urgente: '#ef4444',  // red-500
}

export function StageTimeChart({ data }: StageTimeChartProps) {
  const formatTime = (hours: number) => {
    if (hours === 0) return '0h'
    if (hours < 1) return `${Math.round(hours * 60)}min`
    if (hours < 24) return `${Math.round(hours)}h`
    const days = hours / 24
    return `${Math.round(days * 10) / 10}d`
  }

  // Preparar dados para o gráfico
  const chartData = data.map((stage) => ({
    ...stage,
    shortName: `E${stage.stage_number}`,
    fullName: `${stage.stage_number}. ${stage.name}`,
    // Converter para dias para melhor visualização
    normalDays: stage.normalHours / 24,
    urgenteDays: stage.urgenteHours / 24,
  }))

  const hasData = data.some(d => d.normalHours > 0 || d.urgenteHours > 0)

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string; payload: typeof chartData[0] }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      const stage = chartData.find(s => s.shortName === label)
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-2">{stage?.fullName || label}</p>
          {payload.map((entry, index) => {
            const isNormal = entry.name === 'Normal'
            const hours = isNormal ? stage?.normalHours : stage?.urgenteHours
            const count = isNormal ? stage?.normalCount : stage?.urgenteCount
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-bold">{formatTime(hours || 0)}</span>
                <span className="text-xs text-muted-foreground">({count} cards)</span>
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  // Custom legend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLegend = (props: any) => {
    const { payload } = props
    if (!payload) return null

    return (
      <div className="flex justify-center gap-6 mt-2">
        {payload.map((entry: { value?: string; color?: string }, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Tempo Médio por Etapa</CardTitle>
        </div>
        <CardDescription>
          Comparação entre onboardings Normal e Urgente
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-8 text-muted-foreground">
            Sem dados suficientes de transições entre etapas.
          </div>
        ) : (
          <div className="h-[300px] w-full">
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
                  tickFormatter={(value) => `${value.toFixed(1)}d`}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} />
                <Bar
                  dataKey="normalDays"
                  name="Normal"
                  fill={COLORS.normal}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={25}
                />
                <Bar
                  dataKey="urgenteDays"
                  name="Urgente"
                  fill={COLORS.urgente}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={25}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
