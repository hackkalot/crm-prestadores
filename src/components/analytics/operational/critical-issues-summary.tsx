'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  MapPin,
  Star,
  TrendingDown,
  Clock,
  ChevronRight,
  CheckCircle
} from 'lucide-react'
import type {
  AtRiskProvider,
  CoverageGapItem,
  LowRatingProvider,
  NetworkSaturationMetrics
} from '@/lib/analytics/types'

interface CriticalIssuesSummaryProps {
  atRiskProviders?: AtRiskProvider[]
  coverageGaps?: CoverageGapItem[]
  lowRatingProviders?: LowRatingProvider[]
  networkSaturation?: NetworkSaturationMetrics
}

interface Issue {
  type: 'risk' | 'coverage' | 'rating' | 'saturation'
  severity: 'warning' | 'critical'
  title: string
  description: string
  link?: { href: string; label: string }
}

export function CriticalIssuesSummary({
  atRiskProviders = [],
  coverageGaps = [],
  lowRatingProviders = [],
  networkSaturation
}: CriticalIssuesSummaryProps) {
  const issues: Issue[] = []

  // Check at-risk providers
  const criticalProviders = atRiskProviders.filter(p => p.riskLevel === 'critical')
  const warningProviders = atRiskProviders.filter(p => p.riskLevel === 'warning')

  if (criticalProviders.length > 0) {
    issues.push({
      type: 'risk',
      severity: 'critical',
      title: `${criticalProviders.length} prestador${criticalProviders.length > 1 ? 'es' : ''} em estado crítico`,
      description: `Taxa de expiração >30%: ${criticalProviders.slice(0, 2).map(p => p.providerName).join(', ')}${criticalProviders.length > 2 ? ` e mais ${criticalProviders.length - 2}` : ''}`,
      link: { href: '/analytics?tab=operational', label: 'Ver detalhes' }
    })
  } else if (warningProviders.length > 3) {
    issues.push({
      type: 'risk',
      severity: 'warning',
      title: `${warningProviders.length} prestadores com atenção`,
      description: 'Taxa de expiração entre 20-30%',
      link: { href: '/analytics?tab=operational', label: 'Ver detalhes' }
    })
  }

  // Check coverage gaps
  const criticalGaps = coverageGaps.filter(g => g.riskLevel === 'critical')
  const warningGaps = coverageGaps.filter(g => g.riskLevel === 'warning')

  if (criticalGaps.length > 0) {
    issues.push({
      type: 'coverage',
      severity: 'critical',
      title: `${criticalGaps.length} distrito${criticalGaps.length > 1 ? 's' : ''} com cobertura crítica`,
      description: criticalGaps.slice(0, 3).map(g => g.district).join(', '),
      link: { href: '/rede', label: 'Ver mapa' }
    })
  } else if (warningGaps.length > 0) {
    issues.push({
      type: 'coverage',
      severity: 'warning',
      title: `${warningGaps.length} distrito${warningGaps.length > 1 ? 's' : ''} a monitorizar`,
      description: 'Cobertura ou performance abaixo do esperado',
      link: { href: '/analytics?tab=operational', label: 'Ver detalhes' }
    })
  }

  // Check low rating providers
  const decliningProviders = lowRatingProviders.filter(p => p.recentTrend === 'declining')
  const veryLowRating = lowRatingProviders.filter(p => p.avgRating < 2.5)

  if (veryLowRating.length > 0) {
    issues.push({
      type: 'rating',
      severity: 'critical',
      title: `${veryLowRating.length} prestador${veryLowRating.length > 1 ? 'es' : ''} com rating muito baixo`,
      description: `Rating <2.5: ${veryLowRating.slice(0, 2).map(p => p.providerName).join(', ')}`,
      link: { href: '/analytics?tab=quality', label: 'Ver alertas' }
    })
  } else if (decliningProviders.length > 2) {
    issues.push({
      type: 'rating',
      severity: 'warning',
      title: `${decliningProviders.length} prestadores com rating em queda`,
      description: 'Tendência negativa nas avaliações recentes',
      link: { href: '/analytics?tab=quality', label: 'Ver alertas' }
    })
  }

  // Check network saturation
  if (networkSaturation?.status === 'saturated') {
    issues.push({
      type: 'saturation',
      severity: 'critical',
      title: 'Rede saturada',
      description: networkSaturation.alerts[0] || 'Volume a subir, qualidade a descer',
      link: { href: '/analytics?tab=operational', label: 'Analisar' }
    })
  } else if (networkSaturation?.status === 'warning') {
    issues.push({
      type: 'saturation',
      severity: 'warning',
      title: 'Sinais de saturação',
      description: 'Correlação negativa entre volume e qualidade',
      link: { href: '/analytics?tab=operational', label: 'Analisar' }
    })
  }

  // Sort by severity (critical first)
  issues.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1
    if (a.severity !== 'critical' && b.severity === 'critical') return 1
    return 0
  })

  const getIcon = (type: Issue['type']) => {
    switch (type) {
      case 'risk': return <TrendingDown className="h-4 w-4" />
      case 'coverage': return <MapPin className="h-4 w-4" />
      case 'rating': return <Star className="h-4 w-4" />
      case 'saturation': return <Clock className="h-4 w-4" />
    }
  }

  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Estado da Rede
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4 text-center">
            <div>
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium text-green-700">Tudo operacional</p>
              <p className="text-xs text-muted-foreground">Sem issues críticos detectados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const criticalCount = issues.filter(i => i.severity === 'critical').length
  const warningCount = issues.filter(i => i.severity === 'warning').length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Issues Detectados
          {criticalCount > 0 && (
            <Badge variant="destructive" className="ml-1">
              {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {warningCount} atenção
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Problemas que requerem ação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.slice(0, 4).map((issue, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              issue.severity === 'critical'
                ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
                : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950'
            }`}
          >
            <div className={`mt-0.5 ${issue.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
              {getIcon(issue.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                issue.severity === 'critical' ? 'text-red-900 dark:text-red-100' : 'text-amber-900 dark:text-amber-100'
              }`}>
                {issue.title}
              </p>
              <p className={`text-xs mt-0.5 ${
                issue.severity === 'critical' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                {issue.description}
              </p>
            </div>
            {issue.link && (
              <Button variant="ghost" size="sm" className="shrink-0" asChild>
                <Link href={issue.link.href}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        ))}
        {issues.length > 4 && (
          <p className="text-xs text-muted-foreground text-center">
            +{issues.length - 4} mais issues
          </p>
        )}
      </CardContent>
    </Card>
  )
}
