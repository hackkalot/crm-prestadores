'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ExternalLink, Star } from 'lucide-react'
import type { LowRatingProvider } from '@/lib/analytics/types'

interface LowRatingAlertsProps {
  data: LowRatingProvider[]
}

function getTrendIcon(trend: 'improving' | 'declining' | 'stable') {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="h-4 w-4 text-green-600" />
    case 'declining':
      return <TrendingDown className="h-4 w-4 text-red-600" />
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />
  }
}

function getTrendLabel(trend: 'improving' | 'declining' | 'stable') {
  switch (trend) {
    case 'improving':
      return 'A melhorar'
    case 'declining':
      return 'A piorar'
    default:
      return 'Estável'
  }
}

function getRatingBadgeColor(rating: number) {
  if (rating < 2.5) return 'destructive'
  if (rating < 3.0) return 'default'
  return 'secondary'
}

export function LowRatingAlerts({ data }: LowRatingAlertsProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas de Rating
          </CardTitle>
          <CardDescription>
            Prestadores com rating médio abaixo de 3.0 ou percentagem alta de avaliações baixas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <div className="text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p>Nenhum prestador com alertas de rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Alertas de Rating ({data.length})
        </CardTitle>
        <CardDescription>
          Prestadores com rating médio abaixo de 3.0 ou mais de 30% de avaliações baixas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prestador</TableHead>
              <TableHead className="text-center">Rating Médio</TableHead>
              <TableHead className="text-center">Avaliações</TableHead>
              <TableHead className="text-center">% Abaixo 3.0</TableHead>
              <TableHead className="text-center">Tendência</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((provider) => (
              <TableRow key={provider.backofficeProviderId || provider.providerName}>
                <TableCell className="font-medium">{provider.providerName}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={getRatingBadgeColor(provider.avgRating)}>
                    <Star className="h-3 w-3 mr-1" />
                    {provider.avgRating}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{provider.totalRatings}</TableCell>
                <TableCell className="text-center">
                  <span className={provider.percentBelowThreshold > 50 ? 'text-red-600 font-medium' : ''}>
                    {provider.percentBelowThreshold}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {getTrendIcon(provider.recentTrend)}
                    <span className="text-xs text-muted-foreground">
                      {getTrendLabel(provider.recentTrend)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {provider.backofficeProviderId > 0 ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/providers/${provider.backofficeProviderId}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">ID não encontrado</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
