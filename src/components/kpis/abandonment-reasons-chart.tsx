'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MessageSquareX } from 'lucide-react'
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

interface AbandonmentReasonsChartProps {
  data: Array<{
    reason: string
    count: number
  }>
}

// Cores para as barras (vermelho degradê)
const COLORS = [
  '#ef4444', // red-500
  '#f87171', // red-400
  '#fca5a5', // red-300
  '#fecaca', // red-200
  '#fee2e2', // red-100
]

export function AbandonmentReasonsChart({ data }: AbandonmentReasonsChartProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0)

  // Limitar a top 5 motivos
  const chartData = data.slice(0, 5).map((item, index) => ({
    ...item,
    shortReason: item.reason.length > 25 ? item.reason.slice(0, 22) + '...' : item.reason,
    fill: COLORS[index] || COLORS[COLORS.length - 1],
    percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: {
    active?: boolean
    payload?: Array<{ payload: typeof chartData[0] }>
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-xs">
          <p className="font-medium text-sm break-words">{item.reason}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-bold text-destructive">{item.count}</span>
            <span className="text-xs text-muted-foreground">({item.percent}%)</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <MessageSquareX className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Motivos de Abandono</CardTitle>
        </div>
        <CardDescription>
          Top motivos de desistência
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Sem abandonos registados com motivo.
          </div>
        ) : (
          <>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="shortReason"
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t text-center">
              <span className="text-2xl font-bold text-destructive">{total}</span>
              <p className="text-xs text-muted-foreground">Total de abandonos</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
