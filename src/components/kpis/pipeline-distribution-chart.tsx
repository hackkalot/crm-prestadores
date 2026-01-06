'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GitBranch } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

interface PipelineDistributionChartProps {
  candidaturas: number
  onboarding: number
}

const COLORS = {
  candidaturas: '#f59e0b', // amber-500
  onboarding: '#3b82f6',   // blue-500
}

export function PipelineDistributionChart({ candidaturas, onboarding }: PipelineDistributionChartProps) {
  const total = candidaturas + onboarding

  const data = [
    { name: 'Candidaturas', value: candidaturas, color: COLORS.candidaturas },
    { name: 'Em Onboarding', value: onboarding, color: COLORS.onboarding },
  ].filter(d => d.value > 0)

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0]
      const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{item.name}</p>
          <p className="font-bold" style={{ color: item.payload.color }}>
            {item.value} prestadores ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  // Custom label dentro do pie
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, value } = props
    if (value === 0) return null

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-sm font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  // Custom legend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLegend = (props: any) => {
    const { payload } = props
    if (!payload) return null

    return (
      <div className="flex justify-center gap-6 mt-4">
        {payload.map((entry: { value?: string; color?: string }, index: number) => {
          const item = data.find(d => d.name === entry.value)
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <div className="text-sm">
                <span className="text-muted-foreground">{entry.value}:</span>
                <span className="font-bold ml-1">{item?.value || 0}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Pipeline de Prestadores
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum prestador no pipeline com os filtros selecionados.
          </div>
        ) : (
          <>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Total central */}
            <div className="text-center pt-2 border-t mt-2">
              <span className="text-2xl font-bold text-foreground">{total}</span>
              <p className="text-xs text-muted-foreground">Total no Pipeline</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
