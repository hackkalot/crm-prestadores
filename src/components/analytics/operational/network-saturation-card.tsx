'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { NetworkSaturationMetrics } from '@/lib/analytics/types'

interface NetworkSaturationCardProps {
  data: NetworkSaturationMetrics
}

function getStatusBadgeVariant(status: 'healthy' | 'warning' | 'saturated') {
  switch (status) {
    case 'healthy':
      return 'secondary'
    case 'warning':
      return 'default'
    case 'saturated':
      return 'destructive'
  }
}

function getStatusLabel(status: 'healthy' | 'warning' | 'saturated') {
  switch (status) {
    case 'healthy':
      return 'Saudável'
    case 'warning':
      return 'Atenção'
    case 'saturated':
      return 'Saturado'
  }
}

function getStatusIcon(status: 'healthy' | 'warning' | 'saturated') {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />
    case 'saturated':
      return <AlertTriangle className="h-4 w-4 text-red-600" />
  }
}

function getTrendIcon(value: number) {
  if (value > 5) return <TrendingUp className="h-4 w-4 text-green-600" />
  if (value < -5) return <TrendingDown className="h-4 w-4 text-red-600" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

function getChangeColor(value: number, inverseGood: boolean = false) {
  if (inverseGood) {
    if (value > 5) return 'text-red-600'
    if (value < -5) return 'text-green-600'
    return 'text-muted-foreground'
  }
  if (value > 5) return 'text-green-600'
  if (value < -5) return 'text-red-600'
  return 'text-muted-foreground'
}

export function NetworkSaturationCard({ data }: NetworkSaturationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Saturação da Rede
          <Badge variant={getStatusBadgeVariant(data.status)} className="ml-2">
            {getStatusIcon(data.status)}
            <span className="ml-1">{getStatusLabel(data.status)}</span>
          </Badge>
        </CardTitle>
        <CardDescription>
          Correlação entre volume de pedidos e qualidade de serviço (vs período anterior)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Change metrics grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Volume</span>
              {getTrendIcon(data.volumeChange)}
            </div>
            <p className={`text-xl font-bold ${getChangeColor(data.volumeChange)}`}>
              {data.volumeChange > 0 ? '+' : ''}{data.volumeChange}%
            </p>
          </div>

          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Conclusão</span>
              {getTrendIcon(data.qualityChange)}
            </div>
            <p className={`text-xl font-bold ${getChangeColor(data.qualityChange)}`}>
              {data.qualityChange > 0 ? '+' : ''}{data.qualityChange}%
            </p>
          </div>

          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Aceitação</span>
              {getTrendIcon(data.acceptanceChange)}
            </div>
            <p className={`text-xl font-bold ${getChangeColor(data.acceptanceChange)}`}>
              {data.acceptanceChange > 0 ? '+' : ''}{data.acceptanceChange}%
            </p>
          </div>

          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Expiração</span>
              {getTrendIcon(-data.expirationChange)}
            </div>
            <p className={`text-xl font-bold ${getChangeColor(data.expirationChange, true)}`}>
              {data.expirationChange > 0 ? '+' : ''}{data.expirationChange}%
            </p>
          </div>
        </div>

        {/* Correlation score */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Score de Correlação</p>
            <p className="text-xs text-muted-foreground">
              Negativo = volume sobe, qualidade desce
            </p>
          </div>
          <p className={`text-xl font-bold ${data.correlationScore < -0.3 ? 'text-red-600' : data.correlationScore > 0.3 ? 'text-green-600' : 'text-muted-foreground'}`}>
            {data.correlationScore.toFixed(2)}
          </p>
        </div>

        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div className="space-y-2">
            {data.alerts.map((alert, index) => (
              <Alert key={index} variant={data.status === 'saturated' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{alert}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {data.alerts.length === 0 && data.status === 'healthy' && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              A rede está a operar dentro dos parâmetros normais. Sem alertas de saturação.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
