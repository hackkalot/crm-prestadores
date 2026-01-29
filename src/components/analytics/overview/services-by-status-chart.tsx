'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import type { ServicesByStatusItem } from '@/lib/analytics/types'

interface ServicesByStatusChartProps {
  data: ServicesByStatusItem[]
}

type ChartType = 'bar' | 'pie'

// Extend the type for Recharts compatibility
interface PieDataItem extends ServicesByStatusItem {
  [key: string]: string | number
}

export function ServicesByStatusChart({ data }: ServicesByStatusChartProps) {
  const [chartType, setChartType] = useState<ChartType>('bar')

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Serviços por Estado</CardTitle>
          <CardDescription>Distribuição dos pedidos por estado atual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, item) => sum + item.count, 0)

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ServicesByStatusItem }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <p className="font-medium text-sm">{item.label}</p>
          </div>
          <p className="text-sm">
            <span className="text-muted-foreground">Pedidos: </span>
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
  }

  // Custom legend for pie chart
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderPieLegend = (props: any) => {
    const { payload } = props
    if (!payload) return null
    return (
      <div className="grid grid-cols-2 gap-2 mt-2">
        {payload.map((entry: { value: string; color: string; payload: ServicesByStatusItem }, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground truncate">{entry.value}:</span>
            <span className="font-medium">{entry.payload.count.toLocaleString('pt-PT')}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Serviços por Estado</CardTitle>
            <CardDescription>
              Total: {total.toLocaleString('pt-PT')} pedidos
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={chartType === 'bar' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setChartType('bar')}
              title="Gráfico de barras"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'pie' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setChartType('pie')}
              title="Gráfico circular"
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            {chartType === 'bar' ? (
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => value.toLocaleString('pt-PT')}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  width={110}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={data as PieDataItem[]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="label"
                  label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
                  labelLine={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderPieLegend} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend with counts (only for bar chart) */}
        {chartType === 'bar' && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.map((item) => (
              <div key={item.status} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground truncate">{item.label}:</span>
                <span className="font-medium">{item.count.toLocaleString('pt-PT')}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
