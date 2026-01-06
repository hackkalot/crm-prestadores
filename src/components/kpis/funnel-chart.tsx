'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Users, UserCheck, UserX, ArrowDown } from 'lucide-react'

interface FunnelData {
  candidaturas: number
  emOnboarding: number
  ativos: number
  abandonados: number
  taxaConversao: number
}

interface FunnelChartProps {
  data: FunnelData
}

export function FunnelChart({ data }: FunnelChartProps) {
  const stages = [
    {
      label: 'Candidaturas',
      value: data.candidaturas,
      icon: FileText,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-600',
    },
    {
      label: 'Em Onboarding',
      value: data.emOnboarding,
      icon: Users,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-100 dark:bg-amber-900/30',
      textColor: 'text-amber-600',
    },
    {
      label: 'Ativos',
      value: data.ativos,
      icon: UserCheck,
      color: 'bg-green-500',
      lightColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-600',
    },
  ]

  const maxValue = Math.max(data.candidaturas, 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stages.map((stage, index) => {
            const Icon = stage.icon
            const widthPercentage = (stage.value / maxValue) * 100

            return (
              <div key={stage.label}>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full ${stage.lightColor} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${stage.textColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{stage.label}</span>
                      <span className="text-lg font-bold">{stage.value}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stage.color} transition-all duration-500 rounded-full`}
                        style={{ width: `${Math.max(widthPercentage, stage.value > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
                {index < stages.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Abandonados */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <UserX className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-sm text-muted-foreground">Abandonados</span>
            </div>
            <span className="font-medium text-red-600">{data.abandonados}</span>
          </div>
        </div>

        {/* Taxa de Conversao */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Taxa de Conversão</p>
            <p className="text-3xl font-bold text-green-600">{data.taxaConversao}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Candidaturas convertidas em ativos
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
