'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, PieChart as PieChartIcon, Layers } from 'lucide-react'
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

interface StageData {
  id: string
  stage_number: string
  name: string
  count: number
}

interface StagesChartProps {
  stages: StageData[]
}

// Gradiente de cores (do mais claro ao mais escuro)
const GRADIENT_COLORS = [
  '#93c5fd', // blue-300
  '#60a5fa', // blue-400
  '#3b82f6', // blue-500
  '#2563eb', // blue-600
  '#1d4ed8', // blue-700
  '#1e40af', // blue-800
]

function getGradientColor(index: number, total: number): string {
  const colorIndex = Math.floor((index / Math.max(total - 1, 1)) * (GRADIENT_COLORS.length - 1))
  return GRADIENT_COLORS[colorIndex]
}

export function StagesChart({ stages }: StagesChartProps) {
  const [viewMode, setViewMode] = useState<'bar' | 'pie'>('bar')

  const totalInOnboarding = stages.reduce((acc, s) => acc + s.count, 0)

  // Preparar dados para os gráficos
  const chartData = stages.map((stage, index) => ({
    ...stage,
    shortName: `E${stage.stage_number}`,
    fullName: `${stage.stage_number}. ${stage.name}`,
    fill: getGradientColor(index, stages.length),
  }))

  // Custom tooltip para ambos os gráficos
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{data.fullName}</p>
          <p className="text-primary font-bold">{data.count} prestadores</p>
        </div>
      )
    }
    return null
  }

  // Custom label para o pie chart
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, index } = props
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    const filteredData = chartData.filter(d => d.count > 0)
    const stage = filteredData[index]
    if (!stage || stage.count === 0) return null

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {stage.stage_number}
      </text>
    )
  }

  // Custom legend para o pie chart (mostra apenas os que têm dados)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLegend = (props: any) => {
    const { payload } = props
    if (!payload) return null

    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {payload.filter((entry: { payload?: { count: number } }) => entry.payload?.count && entry.payload.count > 0).map((entry: { value?: string; color?: string }, index: number) => (
          <div key={index} className="flex items-center gap-1.5 text-xs">
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Prestadores por Etapa
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('bar')}
              className="h-8 px-2"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('pie')}
              className="h-8 px-2"
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalInOnboarding === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum prestador em onboarding com os filtros selecionados.
          </div>
        ) : viewMode === 'bar' ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={40}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={30}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.filter(d => d.count > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="fullName"
                >
                  {chartData.filter(d => d.count > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legenda com totais */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">{totalInOnboarding}</span>
              <p className="text-muted-foreground text-xs">Total em Onboarding</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
