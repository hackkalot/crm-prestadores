'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Receipt } from 'lucide-react'
import { ANALYTICS_COLORS } from '@/lib/analytics/constants'
import type { TicketByCategoryItem } from '@/lib/analytics/types'

interface TicketByCategoryChartProps {
  data: TicketByCategoryItem[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function TicketByCategoryChart({ data }: TicketByCategoryChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ticket Médio por Categoria</CardTitle>
          <CardDescription>Valor médio por tipo de serviço</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate overall average
  const totalRevenue = data.reduce((sum, d) => sum + d.totalRevenue, 0)
  const totalCount = data.reduce((sum, d) => sum + d.count, 0)
  const overallAvg = totalCount > 0 ? totalRevenue / totalCount : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Ticket Médio por Categoria
        </CardTitle>
        <CardDescription>
          Média geral: {formatCurrency(overallAvg)} ({totalCount.toLocaleString('pt-PT')} processos)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(v) => `${v}€`}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                width={120}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as TicketByCategoryItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm mb-2">{item.category}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Ticket Médio: </span>
                          <span className="font-bold">{formatCurrency(item.avgTicket)}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Revenue Total: </span>
                          <span className="font-bold">{formatCurrency(item.totalRevenue)}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Processos: </span>
                          <span className="font-bold">{item.count.toLocaleString('pt-PT')}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.percentage}% do revenue total
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="avgTicket"
                fill={ANALYTICS_COLORS.PRIMARY}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
