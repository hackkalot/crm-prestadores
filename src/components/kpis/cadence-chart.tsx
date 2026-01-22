'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
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

interface CadenceData {
  week: string
  entradas: number
  saidas: number
}

interface CadenceChartProps {
  data: CadenceData[]
}

export function CadenceChart({ data }: CadenceChartProps) {
  const totalEntradas = data.reduce((acc, d) => acc + d.entradas, 0)
  const totalSaidas = data.reduce((acc, d) => acc + d.saidas, 0)

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number; name: string; color: string }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-1">Semana {label}</p>
          {payload.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground">{item.name}:</span>
              <span className="font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Cadência Semanal</CardTitle>
        </div>
        <CardDescription>
          Entradas e saídas do funil de onboarding
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Sem dados de cadência para o período selecionado.
          </div>
        ) : (
          <>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `S${value}`}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="square"
                  />
                  <Bar
                    dataKey="entradas"
                    name="Entradas"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                  <Bar
                    dataKey="saidas"
                    name="Saídas"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Totais */}
            <div className="mt-4 pt-4 border-t flex items-center justify-center gap-8">
              <div className="text-center">
                <span className="text-2xl font-bold text-green-600">{totalEntradas}</span>
                <p className="text-xs text-muted-foreground">Entradas</p>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-blue-600">{totalSaidas}</span>
                <p className="text-xs text-muted-foreground">Saídas</p>
              </div>
              <div className="text-center">
                <span className={`text-2xl font-bold ${totalEntradas - totalSaidas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalEntradas - totalSaidas >= 0 ? '+' : ''}{totalEntradas - totalSaidas}
                </span>
                <p className="text-xs text-muted-foreground">Variação</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
