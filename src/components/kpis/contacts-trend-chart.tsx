'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Phone } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ContactsTrendData {
  week: string
  count: number
}

interface ContactsTrendChartProps {
  data: ContactsTrendData[]
}

export function ContactsTrendChart({ data }: ContactsTrendChartProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0)
  const avg = data.length > 0 ? Math.round(total / data.length) : 0

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-1">Semana {label}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Contactos:</span>
            <span className="font-bold text-blue-600">{payload[0].value}</span>
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
          <Phone className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Contactos por Semana</CardTitle>
        </div>
        <CardDescription>
          Tarefas &quot;Ligar&quot; concluídas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Sem dados de contactos para o período selecionado.
          </div>
        ) : (
          <>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
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
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Totais */}
            <div className="mt-4 pt-4 border-t flex items-center justify-center gap-8">
              <div className="text-center">
                <span className="text-2xl font-bold text-blue-600">{total}</span>
                <p className="text-xs text-muted-foreground">Total contactos</p>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-muted-foreground">{avg}</span>
                <p className="text-xs text-muted-foreground">Média/semana</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
