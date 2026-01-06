'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

interface HealthIndicatorsProps {
  data: {
    onTime: number
    atRisk: number
    delayed: number
    total: number
  }
}

export function HealthIndicators({ data }: HealthIndicatorsProps) {
  const { onTime, atRisk, delayed, total } = data

  const onTimePercent = total > 0 ? Math.round((onTime / total) * 100) : 0
  const atRiskPercent = total > 0 ? Math.round((atRisk / total) * 100) : 0
  const delayedPercent = total > 0 ? Math.round((delayed / total) * 100) : 0

  const indicators = [
    {
      label: 'No Prazo',
      value: onTime,
      percent: onTimePercent,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      barColor: 'bg-green-500',
    },
    {
      label: 'Em Risco',
      value: atRisk,
      percent: atRiskPercent,
      icon: AlertTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      barColor: 'bg-amber-500',
    },
    {
      label: 'Atrasados',
      value: delayed,
      percent: delayedPercent,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      barColor: 'bg-red-500',
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Saúde do Onboarding</CardTitle>
        </div>
        <CardDescription>
          SLA: Normal 14 dias | Urgente 5 dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum prestador em onboarding.
          </div>
        ) : (
          <div className="space-y-4">
            {indicators.map((indicator) => {
              const Icon = indicator.icon
              return (
                <div key={indicator.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${indicator.bgColor}`}>
                        <Icon className={`h-4 w-4 ${indicator.color}`} />
                      </div>
                      <span className="font-medium text-sm">{indicator.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${indicator.color}`}>
                        {indicator.value}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({indicator.percent}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${indicator.barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${indicator.percent}%` }}
                    />
                  </div>
                </div>
              )
            })}

            {/* Summary bar */}
            <div className="pt-4 mt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Distribuição Total</span>
                <span className="text-sm font-medium">{total} em onboarding</span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                {onTime > 0 && (
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${onTimePercent}%` }}
                    title={`No Prazo: ${onTime}`}
                  />
                )}
                {atRisk > 0 && (
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${atRiskPercent}%` }}
                    title={`Em Risco: ${atRisk}`}
                  />
                )}
                {delayed > 0 && (
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${delayedPercent}%` }}
                    title={`Atrasados: ${delayed}`}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
