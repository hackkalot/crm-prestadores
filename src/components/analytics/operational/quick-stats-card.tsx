'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Clock, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { OperationalSummary, ResponseTimeDistribution } from '@/lib/analytics/types'

interface QuickStatsCardProps {
  summary: OperationalSummary
  responseTime: ResponseTimeDistribution[]
}

function getTrendIcon(value: number) {
  if (value > 0) return <TrendingUp className="h-3 w-3 text-green-600" />
  if (value < 0) return <TrendingDown className="h-3 w-3 text-red-600" />
  return <Minus className="h-3 w-3 text-muted-foreground" />
}

function getTrendColor(value: number, inverse: boolean = false) {
  if (inverse) {
    if (value > 0) return 'text-red-600'
    if (value < 0) return 'text-green-600'
    return 'text-muted-foreground'
  }
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-muted-foreground'
}

export function QuickStatsCard({ summary, responseTime }: QuickStatsCardProps) {
  // Calculate fast response percentage (0-4h + 4-12h)
  const fastResponses = responseTime
    .filter((r) => r.bucket === '0-4h' || r.bucket === '4-12h')
    .reduce((sum, r) => sum + r.percentage, 0)

  const slowResponses = responseTime
    .filter((r) => r.bucket === '24h+')
    .reduce((sum, r) => sum + r.percentage, 0)

  const atRiskPercentage = summary.totalActiveProviders > 0
    ? Math.round((summary.atRiskProvidersCount / summary.totalActiveProviders) * 100)
    : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Métricas Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Total Pedidos */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              Pedidos
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {summary.totalRequests.toLocaleString('pt-PT')}
              </span>
              <span className={`text-xs flex items-center gap-0.5 ${getTrendColor(summary.requestsTrend)}`}>
                {getTrendIcon(summary.requestsTrend)}
                {summary.requestsTrend > 0 ? '+' : ''}{summary.requestsTrend}%
              </span>
            </div>
          </div>

          {/* Taxa Aceitação */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle className="h-4 w-4" />
              Aceitação
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {summary.networkAcceptanceRate}%
              </span>
              <span className={`text-xs flex items-center gap-0.5 ${getTrendColor(summary.acceptanceTrend)}`}>
                {getTrendIcon(summary.acceptanceTrend)}
                {summary.acceptanceTrend > 0 ? '+' : ''}{summary.acceptanceTrend}%
              </span>
            </div>
          </div>

          {/* Tempo Resposta */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              Resposta Rápida
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${fastResponses >= 70 ? 'text-green-600' : fastResponses >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {Math.round(fastResponses)}%
              </span>
              <span className="text-xs text-muted-foreground">
                &lt;12h
              </span>
            </div>
            {slowResponses > 10 && (
              <p className="text-xs text-red-600">
                {Math.round(slowResponses)}% &gt;24h
              </p>
            )}
          </div>

          {/* Prestadores em Risco */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="h-4 w-4" />
              Em Risco
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${atRiskPercentage <= 10 ? 'text-green-600' : atRiskPercentage <= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                {summary.atRiskProvidersCount}
              </span>
              <span className="text-xs text-muted-foreground">
                de {summary.totalActiveProviders}
              </span>
            </div>
            <p className={`text-xs ${atRiskPercentage <= 10 ? 'text-green-600' : atRiskPercentage <= 25 ? 'text-amber-600' : 'text-red-600'}`}>
              {atRiskPercentage}% da rede
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
