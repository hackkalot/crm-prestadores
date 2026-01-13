'use client'

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
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { AtRiskProvider } from '@/lib/analytics/types'

interface AtRiskProvidersTableProps {
  data: AtRiskProvider[]
}

export function AtRiskProvidersTable({ data }: AtRiskProvidersTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prestadores em Risco</CardTitle>
          <CardDescription>
            Prestadores com taxa de expiração acima do limite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mb-4">
              <span className="text-2xl">&#10003;</span>
            </div>
            <p className="text-lg font-medium text-green-600">Nenhum prestador em risco</p>
            <p className="text-sm text-muted-foreground mt-1">
              Todos os prestadores estão dentro dos limites de SLA
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prestadores em Risco</CardTitle>
        <CardDescription>
          {data.length} prestador{data.length !== 1 ? 'es' : ''} com taxa de expiração elevada
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prestador</TableHead>
                <TableHead className="text-right">Recebidos</TableHead>
                <TableHead className="text-right">Aceites</TableHead>
                <TableHead className="text-right">Expirados</TableHead>
                <TableHead className="text-right">Taxa Exp.</TableHead>
                <TableHead className="text-right">Resposta</TableHead>
                <TableHead className="text-center">Risco</TableHead>
                <TableHead className="text-center">Acao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((provider) => (
                <TableRow key={provider.backofficeProviderId}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {provider.providerName}
                  </TableCell>
                  <TableCell className="text-right">{provider.requestsReceived}</TableCell>
                  <TableCell className="text-right">{provider.requestsAccepted}</TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    {provider.requestsExpired}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={provider.expirationRate > 30 ? 'text-red-600 font-bold' : 'text-amber-600 font-medium'}>
                      {provider.expirationRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {provider.avgResponseTime || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={provider.riskLevel === 'critical' ? 'destructive' : 'secondary'}
                      className={provider.riskLevel === 'warning' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : ''}
                    >
                      {provider.riskLevel === 'critical' ? 'Critico' : 'Atencao'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/alocacoes?search=${encodeURIComponent(provider.providerName)}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
