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
import { MapPin, AlertTriangle, ExternalLink, Users } from 'lucide-react'
import type { CoverageGapItem } from '@/lib/analytics/types'

interface CoverageGapsTableProps {
  data: CoverageGapItem[]
}

function getRiskBadgeVariant(level: 'ok' | 'warning' | 'critical') {
  switch (level) {
    case 'ok':
      return 'secondary'
    case 'warning':
      return 'default'
    case 'critical':
      return 'destructive'
  }
}

function getRiskLabel(level: 'ok' | 'warning' | 'critical') {
  switch (level) {
    case 'ok':
      return 'OK'
    case 'warning':
      return 'Atenção'
    case 'critical':
      return 'Crítico'
  }
}

export function CoverageGapsTable({ data }: CoverageGapsTableProps) {
  // Filter to show only problematic districts
  const problematicDistricts = data.filter((d) => d.riskLevel !== 'ok')

  if (problematicDistricts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Gaps de Cobertura
          </CardTitle>
          <CardDescription>
            Distritos com problemas de cobertura ou desempenho
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <div className="text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p>Todos os distritos com cobertura adequada</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const criticalCount = problematicDistricts.filter((d) => d.riskLevel === 'critical').length
  const warningCount = problematicDistricts.filter((d) => d.riskLevel === 'warning').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Gaps de Cobertura
          {criticalCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="default" className="ml-2">
              {warningCount} atenção
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Distritos com problemas de cobertura ou desempenho
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Distrito</TableHead>
              <TableHead className="text-center">Pedidos</TableHead>
              <TableHead className="text-center">Prestadores</TableHead>
              <TableHead className="text-center">Conclusão</TableHead>
              <TableHead className="text-center">Risco</TableHead>
              <TableHead>Problemas</TableHead>
              <TableHead className="text-right">Mapa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {problematicDistricts.map((district) => (
              <TableRow key={district.district}>
                <TableCell className="font-medium">{district.district}</TableCell>
                <TableCell className="text-center">
                  {district.totalRequests.toLocaleString('pt-PT')}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className={district.providersCount <= 1 ? 'text-red-600 font-medium' : ''}>
                      {district.providersCount}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className={district.acceptanceRate < 50 ? 'text-red-600 font-medium' : ''}>
                    {district.acceptanceRate}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getRiskBadgeVariant(district.riskLevel)}>
                    {getRiskLabel(district.riskLevel)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {district.issues.slice(0, 2).map((issue, idx) => (
                      <span key={idx} className="text-xs text-muted-foreground">
                        {issue}
                        {idx < Math.min(district.issues.length - 1, 1) ? ' • ' : ''}
                      </span>
                    ))}
                    {district.issues.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{district.issues.length - 2}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/rede?district=${encodeURIComponent(district.district)}`}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Ver
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
