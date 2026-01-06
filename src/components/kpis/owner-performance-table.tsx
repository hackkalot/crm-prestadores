'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Users, Trophy } from 'lucide-react'

interface OwnerPerformanceTableProps {
  data: Array<{
    id: string
    name: string
    email: string
    totalCards: number
    completedCards: number
    inProgressCards: number
    averageDays: number
    completionRate: number
  }>
}

export function OwnerPerformanceTable({ data }: OwnerPerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Performance por Owner</CardTitle>
        </div>
        <CardDescription>
          Desempenho de cada responsavel pelo onboarding
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Sem dados de performance
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((owner, index) => (
              <div
                key={owner.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card"
              >
                {/* Ranking badge */}
                <div className="flex-shrink-0">
                  {index < 3 ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                        : index === 1
                          ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                    }`}>
                      <Trophy className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Owner info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{owner.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {owner.email}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  {/* Cards count */}
                  <div className="text-center min-w-[80px]">
                    <div className="text-lg font-semibold">{owner.completedCards}</div>
                    <div className="text-xs text-muted-foreground">
                      de {owner.totalCards} cards
                    </div>
                  </div>

                  {/* Average time */}
                  <div className="text-center min-w-[70px]">
                    <div className="text-lg font-semibold">
                      {owner.averageDays > 0 ? `${owner.averageDays}d` : '-'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      tempo médio
                    </div>
                  </div>

                  {/* Completion rate */}
                  <div className="min-w-[100px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Taxa</span>
                      <span className="text-sm font-medium">{owner.completionRate}%</span>
                    </div>
                    <Progress
                      value={owner.completionRate}
                      className="h-2"
                    />
                  </div>

                  {/* Status badge */}
                  <Badge
                    variant={
                      owner.completionRate >= 80
                        ? 'success'
                        : owner.completionRate >= 50
                          ? 'warning'
                          : 'secondary'
                    }
                    className="flex-shrink-0"
                  >
                    {owner.inProgressCards} em curso
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
