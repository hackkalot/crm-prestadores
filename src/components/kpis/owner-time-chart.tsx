'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Trophy, Clock } from 'lucide-react'
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

interface OwnerTimeChartProps {
  data: Array<{
    id: string
    name: string
    averageDays: number
    count: number
  }>
}

// Gradiente de cores (verde para rápido, vermelho para lento)
const getColorByRank = (index: number, total: number): string => {
  const colors = [
    '#22c55e', // green-500
    '#84cc16', // lime-500
    '#eab308', // yellow-500
    '#f97316', // orange-500
    '#ef4444', // red-500
  ]
  const colorIndex = Math.min(Math.floor((index / Math.max(total - 1, 1)) * (colors.length - 1)), colors.length - 1)
  return colors[colorIndex]
}

export function OwnerTimeChart({ data }: OwnerTimeChartProps) {
  // Preparar dados para o gráfico
  const chartData = data.map((owner, index) => ({
    ...owner,
    shortName: owner.name.split(' ')[0], // Primeiro nome apenas
    fill: getColorByRank(index, data.length),
    rank: index + 1,
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: {
    active?: boolean
    payload?: Array<{ payload: typeof chartData[0] }>
  }) => {
    if (active && payload && payload.length) {
      const owner = payload[0].payload
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{owner.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">{owner.averageDays} dias</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {owner.count} onboardings concluídos
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Tempo Médio por Owner</CardTitle>
        </div>
        <CardDescription>
          Ranking por velocidade de conclusão (mais rápido primeiro)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Sem dados suficientes de onboardings concluídos.
          </div>
        ) : (
          <>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}d`}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="averageDays" radius={[0, 4, 4, 0]} maxBarSize={25}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 3 podium */}
            {chartData.length >= 3 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-center items-end gap-4">
                  {/* 2nd place */}
                  <div className="text-center">
                    <div className="text-2xl mb-1">🥈</div>
                    <p className="text-xs font-medium truncate max-w-20">{chartData[1]?.shortName}</p>
                    <p className="text-xs text-muted-foreground">{chartData[1]?.averageDays}d</p>
                  </div>
                  {/* 1st place */}
                  <div className="text-center">
                    <div className="text-3xl mb-1">🥇</div>
                    <p className="text-sm font-bold truncate max-w-20">{chartData[0]?.shortName}</p>
                    <p className="text-xs text-muted-foreground">{chartData[0]?.averageDays}d</p>
                  </div>
                  {/* 3rd place */}
                  <div className="text-center">
                    <div className="text-2xl mb-1">🥉</div>
                    <p className="text-xs font-medium truncate max-w-20">{chartData[2]?.shortName}</p>
                    <p className="text-xs text-muted-foreground">{chartData[2]?.averageDays}d</p>
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
