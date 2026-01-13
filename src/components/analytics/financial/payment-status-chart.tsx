'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { PaymentStatusItem } from '@/lib/analytics/types'

interface PaymentStatusChartProps {
  data: PaymentStatusItem[]
}

const STATUS_COLORS: Record<string, string> = {
  'por enviar': '#f59e0b',    // amber
  'em análise': '#3b82f6',    // blue
  'não aceite': '#ef4444',    // red
  'aceite': '#22c55e',        // green
  'pago': '#10b981',          // emerald
  'arquivado': '#6b7280',     // gray
  'desconhecido': '#94a3b8',  // slate
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function PaymentStatusChart({ data }: PaymentStatusChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const totalValue = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado dos Pagamentos</CardTitle>
          <CardDescription>Distribuicao dos processos por estado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Sem dados disponiveis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Convert to chart-compatible format
  const chartData = data.map((d) => ({ ...d }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estado dos Pagamentos</CardTitle>
        <CardDescription>
          {total.toLocaleString('pt-PT')} processos ({formatCurrency(totalValue)})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                nameKey="status"
                label={({ percent }) =>
                  (percent as number) > 0.05 ? `${Math.round((percent as number) * 100)}%` : ''
                }
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.status] || STATUS_COLORS['desconhecido']}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as PaymentStatusItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm">{formatStatusLabel(item.status)}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Processos: </span>
                          <span className="font-bold">{item.count}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Valor: </span>
                          <span className="font-bold">{formatCurrency(item.value)}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Percentagem: </span>
                          <span className="font-bold">{item.percentage}%</span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">
                    {formatStatusLabel(value as string)}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
