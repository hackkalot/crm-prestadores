'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Users, AlertTriangle, CheckCircle2, Target } from 'lucide-react'
import { getMunicipalityCoverage } from '@/lib/network/coverage-actions'
import type { MunicipalityCoverage, ServiceCoverage } from '@/lib/network/coverage-actions'
import { useRouter } from 'next/navigation'

interface MunicipalityCoverageDialogProps {
  municipality: string | null
  district?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MunicipalityCoverageDialog({
  municipality,
  district,
  open,
  onOpenChange,
}: MunicipalityCoverageDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [coverage, setCoverage] = useState<MunicipalityCoverage | null>(null)

  useEffect(() => {
    if (open && municipality) {
      loadCoverage()
    }
  }, [open, municipality, district])

  const loadCoverage = async () => {
    if (!municipality) return

    setLoading(true)
    const data = await getMunicipalityCoverage(municipality, district)
    setCoverage(data)
    setLoading(false)
  }

  const getStatusBadge = (status: ServiceCoverage['status']) => {
    switch (status) {
      case 'good':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Boa
          </Badge>
        )
      case 'low':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Baixa
          </Badge>
        )
      case 'bad':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Má
          </Badge>
        )
    }
  }

  const handleCreatePriority = (service: ServiceCoverage) => {
    // Redirect to priorities page with pre-filled data via query params
    const params = new URLSearchParams({
      type: 'recruitment',
      title: service.recommendation || `Reforçar ${service.service} em ${municipality}`,
      description: `Gap de cobertura identificado: ${service.provider_count} prestador(es) ativo(s) em ${municipality}`,
      district: coverage?.district || '',
      service: service.service,
      municipality: municipality || '',
    })

    router.push(`/prioridades?create=true&${params.toString()}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Cobertura de Serviços - {municipality}
          </DialogTitle>
          <DialogDescription>
            Análise detalhada de cobertura por serviço e recomendações de reforço
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : coverage ? (
          <div className="flex-1 overflow-auto space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Serviços
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{coverage.totalServices}</div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">
                    Boa Cobertura
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">
                    {coverage.goodCoverage}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700">
                    Baixa Cobertura
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700">
                    {coverage.lowCoverage}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-700">
                    Má Cobertura
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700">
                    {coverage.badCoverage}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Services Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-center">Pedidos</TableHead>
                    <TableHead className="text-center">Prestadores</TableHead>
                    <TableHead className="text-center">Capacidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recomendação</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coverage.services
                    .sort((a, b) => {
                      // Sort by status: bad first, then low, then good
                      const statusOrder = { bad: 0, low: 1, good: 2 }
                      return statusOrder[a.status] - statusOrder[b.status]
                    })
                    .map((service, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{service.category}</TableCell>
                        <TableCell>{service.service}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold">{service.request_count}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{service.provider_count}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${
                            service.capacity_percentage >= 100 ? 'text-green-600' :
                            service.capacity_percentage >= 50 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            {service.capacity_percentage}%
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(service.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {service.recommendation || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {service.status !== 'good' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCreatePriority(service)}
                            >
                              <Target className="h-4 w-4 mr-1" />
                              Criar Prioridade
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Legend */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Critérios de Cobertura</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="text-muted-foreground mb-2">
                  <strong className="text-foreground">Capacidade = (Prestadores × Pedidos por Prestador) / Total Pedidos × 100%</strong>
                </p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>
                    <strong>🟢 Boa:</strong> Capacidade ≥ 100%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>
                    <strong>🟡 Baixa:</strong> Capacidade entre 50-99%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>
                    <strong>🔴 Má:</strong> Capacidade {'<'} 50%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Nenhum dado de cobertura disponível
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
