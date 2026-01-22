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
  Legend,
} from 'recharts'

interface AbandonmentReasonsChartProps {
  data: Array<{
    reason: string
    count: number
    prestador: number
    fixo: number
  }>
}

export function AbandonmentReasonsChart({ data }: AbandonmentReasonsChartProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0)
  const totalPrestador = data.reduce((acc, d) => acc + d.prestador, 0)
  const totalFixo = data.reduce((acc, d) => acc + d.fixo, 0)

  // Limitar a top 5 motivos
  const chartData = data.slice(0, 5).map((item) => ({
    ...item,
    shortReason: item.reason.length > 25 ? item.reason.slice(0, 22) + '...' : item.reason,
    percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: {
    active?: boolean
    payload?: Array<{ payload: typeof chartData[0]; name: string; value: number; color: string }>
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-xs">
          <p className="font-medium text-sm break-words">{item.reason}</p>
          <div className="mt-2 space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">{entry.name}:</span>
                <span className="font-bold">{entry.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total:</span>
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
          Top motivos de desistência por responsável
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
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="square"
                  />
                  <Bar
                    dataKey="prestador"
                    name="Prestador"
                    stackId="a"
                    fill="#ef4444"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="fixo"
                    name="FIXO"
                    stackId="a"
                    fill="#f97316"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Totais */}
            <div className="mt-4 pt-4 border-t flex items-center justify-center gap-6">
              <div className="text-center">
                <span className="text-2xl font-bold text-red-500">{totalPrestador}</span>
                <p className="text-xs text-muted-foreground">Prestador</p>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-orange-500">{totalFixo}</span>
                <p className="text-xs text-muted-foreground">FIXO</p>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-destructive">{total}</span>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
