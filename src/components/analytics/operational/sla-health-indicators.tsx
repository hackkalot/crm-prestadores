'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ANALYTICS_COLORS } from '@/lib/analytics/constants'
import { FileText, Users } from 'lucide-react'
import type { NetworkHealthData } from '@/lib/analytics/types'

interface SlaHealthIndicatorsProps {
  data: NetworkHealthData
}

const STATUS_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  ok: {
    title: 'Saudável',
    description: 'Taxa de expiração ≤10%. Prestadores a operar dentro dos parâmetros normais, com boa capacidade de resposta e aceitação de pedidos.',
  },
  warning: {
    title: 'Em Risco',
    description: 'Taxa de expiração entre 10-30%. Prestadores que podem estar sobrecarregados ou com dificuldades. Recomenda-se monitorização.',
  },
  critical: {
    title: 'Crítico',
    description: 'Taxa de expiração >30%. Prestadores com sérios problemas de capacidade ou disponibilidade. Ação urgente necessária.',
  },
}

const getColor = (status: string) => {
  switch (status) {
    case 'ok':
      return ANALYTICS_COLORS.OK
    case 'warning':
      return ANALYTICS_COLORS.WARNING
    case 'critical':
      return ANALYTICS_COLORS.CRITICAL
    default:
      return ANALYTICS_COLORS.MUTED
  }
}

function getHealthScoreColor(score: number) {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function getHealthScoreLabel(score: number) {
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Boa'
  if (score >= 40) return 'Atenção'
  if (score >= 20) return 'Crítica'
  return 'Urgente'
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: {
      status: string
      label: string
      count: number
      percentage: number
    }
  }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  const info = STATUS_DESCRIPTIONS[data.status]

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-4 max-w-[280px]">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: getColor(data.status) }}
        />
        <span className="font-semibold">{info?.title || data.label}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Prestadores:</span>
          <span className="font-medium">{data.count}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Percentagem:</span>
          <span className="font-medium">{data.percentage}%</span>
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t">
          {info?.description}
        </p>
      </div>
    </div>
  )
}

export function SlaHealthIndicators({ data }: SlaHealthIndicatorsProps) {
  const { indicators, totalProviders, totalServiceRequests, healthScore } = data

  if (totalProviders === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saúde da Rede</CardTitle>
          <CardDescription>Distribuição de prestadores por nível de risco</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for pie chart
  const chartData = indicators.map((item) => ({
    ...item,
    name: item.label,
    value: item.count,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Saúde da Rede</CardTitle>
        <CardDescription>
          Distribuição de prestadores por nível de risco
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          {/* Pie Chart with center label */}
          <div className="relative h-[180px] w-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={getColor(entry.status)}
                      className="transition-opacity hover:opacity-80 cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-3xl font-bold ${getHealthScoreColor(healthScore)}`}>
                {healthScore}%
              </span>
              <span className="text-xs text-muted-foreground">saúde</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {indicators.map((item) => {
              const info = STATUS_DESCRIPTIONS[item.status]
              return (
                <div key={item.status} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: getColor(item.status) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium">{info?.title || item.label}</span>
                      <span className="text-lg font-bold ml-2">{item.count}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-3 border-t text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{totalProviders} prestadores ativos</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{totalServiceRequests.toLocaleString('pt-PT')} pedidos no período</span>
          </div>
        </div>

        {/* Explanation */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p>
            <strong className={getHealthScoreColor(healthScore)}>
              Saúde {getHealthScoreLabel(healthScore)}
            </strong>
            {' — '}
            A saúde é calculada com base na taxa de expiração dos prestadores.
            {healthScore >= 70 && ' A maioria dos prestadores está a responder bem aos pedidos.'}
            {healthScore >= 40 && healthScore < 70 && ' Alguns prestadores mostram sinais de sobrecarga.'}
            {healthScore < 40 && ' Muitos prestadores estão com dificuldades em responder a tempo.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
