'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, PieChart, TrendingUp } from 'lucide-react'
import type { ConcentrationMetrics } from '@/lib/analytics/types'

interface ConcentrationCardProps {
  data: ConcentrationMetrics
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getRiskBadgeVariant(level: 'low' | 'medium' | 'high' | 'critical') {
  switch (level) {
    case 'low':
      return 'secondary'
    case 'medium':
      return 'default'
    case 'high':
      return 'destructive'
    case 'critical':
      return 'destructive'
  }
}

function getRiskLabel(level: 'low' | 'medium' | 'high' | 'critical') {
  switch (level) {
    case 'low':
      return 'Baixo'
    case 'medium':
      return 'Médio'
    case 'high':
      return 'Alto'
    case 'critical':
      return 'Crítico'
  }
}

function getRiskDescription(metrics: ConcentrationMetrics): string {
  if (metrics.riskLevel === 'critical') {
    return `Concentração muito alta - top prestador representa ${metrics.topProviderShare}% da faturação`
  }
  if (metrics.riskLevel === 'high') {
    return `Concentração elevada - top 3 representam ${metrics.top3Share}% da faturação`
  }
  if (metrics.riskLevel === 'medium') {
    return `Concentração moderada - monitorizar evolução`
  }
  return 'Faturação bem distribuída pela rede'
}

export function ConcentrationCard({ data }: ConcentrationCardProps) {
  const hasData = data.topProviders.length > 0

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Concentração de Faturação
          </CardTitle>
          <CardDescription>Análise de dependência de prestadores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PieChart className="h-4 w-4" />
          Concentração de Faturação
          <Badge variant={getRiskBadgeVariant(data.riskLevel)} className="ml-2">
            {data.riskLevel === 'critical' || data.riskLevel === 'high' ? (
              <AlertTriangle className="h-3 w-3 mr-1" />
            ) : null}
            Risco {getRiskLabel(data.riskLevel)}
          </Badge>
        </CardTitle>
        <CardDescription>{getRiskDescription(data)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{data.topProviderShare}%</p>
            <p className="text-xs text-muted-foreground">Top 1</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{data.top3Share}%</p>
            <p className="text-xs text-muted-foreground">Top 3</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{data.top5Share}%</p>
            <p className="text-xs text-muted-foreground">Top 5</p>
          </div>
        </div>

        {/* HHI indicator */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Índice HHI</span>
            <span className="font-medium">{data.herfindahlIndex.toLocaleString('pt-PT')}</span>
          </div>
          <Progress
            value={Math.min((data.herfindahlIndex / 2500) * 100, 100)}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {'<'}1000 = Baixo | 1000-1800 = Moderado | 1800-2500 = Alto | {'>'}2500 = Muito Alto
          </p>
        </div>

        {/* Top providers breakdown */}
        <div>
          <p className="text-sm font-medium mb-3">Top 5 Prestadores</p>
          <div className="space-y-2">
            {data.topProviders.map((provider, index) => (
              <div key={provider.name} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-4">{index + 1}.</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate max-w-[150px]">{provider.name}</span>
                    <span className="font-medium">{provider.percentage}%</span>
                  </div>
                  <Progress value={provider.percentage} className="h-1.5" />
                </div>
                <span className="text-xs text-muted-foreground min-w-[80px] text-right">
                  {formatCurrency(provider.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
