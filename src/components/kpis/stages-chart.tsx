'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StageData {
  id: string
  stage_number: string
  name: string
  count: number
}

interface StagesChartProps {
  stages: StageData[]
}

export function StagesChart({ stages }: StagesChartProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  const totalInOnboarding = stages.reduce((acc, s) => acc + s.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Prestadores por Etapa</CardTitle>
      </CardHeader>
      <CardContent>
        {totalInOnboarding === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum prestador em onboarding com os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage) => {
              const percentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0

              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[200px]">
                      {stage.stage_number}. {stage.name}
                    </span>
                    <span className="font-bold text-primary">{stage.count}</span>
                  </div>
                  <div className="h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(percentage, stage.count > 0 ? 5 : 0)}%` }}
                    >
                      {stage.count > 0 && percentage >= 15 && (
                        <span className="text-xs text-primary-foreground font-medium">
                          {stage.count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
