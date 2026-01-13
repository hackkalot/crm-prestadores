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
  Cell,
} from 'recharts'
import { Star } from 'lucide-react'
import { ANALYTICS_COLORS } from '@/lib/analytics/constants'
import type { RatingByCategoryItem } from '@/lib/analytics/types'

interface RatingByCategoryChartProps {
  data: RatingByCategoryItem[]
}

function getRatingColor(rating: number): string {
  if (rating >= 4.5) return ANALYTICS_COLORS.OK
  if (rating >= 4.0) return ANALYTICS_COLORS.PRIMARY
  if (rating >= 3.0) return ANALYTICS_COLORS.WARNING
  return ANALYTICS_COLORS.CRITICAL
}

export function RatingByCategoryChart({ data }: RatingByCategoryChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rating por Categoria</CardTitle>
          <CardDescription>Avaliação média por tipo de serviço</CardDescription>
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
  const totalRatings = data.reduce((sum, d) => sum + d.totalRatings, 0)
  const weightedSum = data.reduce((sum, d) => sum + d.avgRating * d.totalRatings, 0)
  const overallAvg = totalRatings > 0 ? (weightedSum / totalRatings).toFixed(1) : '0'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-4 w-4" />
          Rating por Categoria
        </CardTitle>
        <CardDescription>
          Média geral: {overallAvg} / 5 ({totalRatings.toLocaleString('pt-PT')} avaliações)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 5]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(v) => `${v}`}
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
                    const item = payload[0].payload as RatingByCategoryItem
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium text-sm mb-2">{item.category}</p>
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold">{item.avgRating}</span>
                          <span className="text-muted-foreground">/ 5</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.totalRatings.toLocaleString('pt-PT')} avaliações
                        </p>
                        {item.ratingDistribution && (
                          <div className="mt-2 pt-2 border-t text-xs">
                            {item.ratingDistribution.map((d) => (
                              <div key={d.rating} className="flex justify-between gap-4">
                                <span>{d.rating} estrelas:</span>
                                <span>{d.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="avgRating" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getRatingColor(entry.avgRating)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
