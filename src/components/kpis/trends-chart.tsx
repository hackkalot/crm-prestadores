'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface TrendsChartProps {
  aggregationType: 'day' | 'week' | 'month'
  data: Array<{
    key: string
    label: string
    candidaturas: number
    ativacoes: number
  }>
}

const COLORS = {
  candidaturas: '#f59e0b', // amber-500
  ativacoes: '#22c55e',    // green-500
}

const AGGREGATION_LABELS = {
  day: 'Por dia',
  week: 'Por semana',
  month: 'Por mês',
}

export function TrendsChart({ aggregationType, data }: TrendsChartProps) {
  const hasData = data.some(d => d.candidaturas > 0 || d.ativacoes > 0)

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      const monthData = data.find(d => d.label === label)
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-bold">{entry.value}</span>
            </div>
          ))}
          {monthData && monthData.candidaturas > 0 && monthData.ativacoes > 0 && (
            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
              Taxa de conversão: {Math.round((monthData.ativacoes / monthData.candidaturas) * 100)}%
            </div>
          )}
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
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  // Calcular totais
  const totalCandidaturas = data.reduce((acc, d) => acc + d.candidaturas, 0)
  const totalAtivacoes = data.reduce((acc, d) => acc + d.ativacoes, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Tendências</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {AGGREGATION_LABELS[aggregationType]}
          </span>
        </div>
        <CardDescription>
          Evolução de candidaturas e ativações ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-8 text-muted-foreground">
            Sem dados suficientes para mostrar tendências.
          </div>
        ) : (
          <>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={35}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                  <Line
                    type="monotone"
                    dataKey="candidaturas"
                    name="Candidaturas"
                    stroke={COLORS.candidaturas}
                    strokeWidth={2}
                    dot={{ r: 4, fill: COLORS.candidaturas }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ativacoes"
                    name="Ativações"
                    stroke={COLORS.ativacoes}
                    strokeWidth={2}
                    dot={{ r: 4, fill: COLORS.ativacoes }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Totais */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <span className="text-xl font-bold" style={{ color: COLORS.candidaturas }}>
                    {totalCandidaturas}
                  </span>
                  <p className="text-xs text-muted-foreground">Candidaturas</p>
                </div>
                <div className="text-center">
                  <span className="text-xl font-bold" style={{ color: COLORS.ativacoes }}>
                    {totalAtivacoes}
                  </span>
                  <p className="text-xs text-muted-foreground">Ativações</p>
                </div>
                {totalCandidaturas > 0 && (
                  <div className="text-center">
                    <span className="text-xl font-bold text-primary">
                      {Math.round((totalAtivacoes / totalCandidaturas) * 100)}%
                    </span>
                    <p className="text-xs text-muted-foreground">Conversão</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
