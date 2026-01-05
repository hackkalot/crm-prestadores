'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NetworkGap, ProviderMatch } from '@/lib/network/actions'
import { findProvidersForGap } from '@/lib/network/actions'
import { PORTUGAL_DISTRICTS, BASE_SERVICES } from '@/lib/network/constants'
import {
  AlertTriangle,
  AlertCircle,
  Search,
  MapPin,
  Wrench,
  Users,
  Mail,
  Phone,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface NetworkGapsListProps {
  gaps: NetworkGap[]
}

export function NetworkGapsList({ gaps }: NetworkGapsListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDistrict, setFilterDistrict] = useState<string>('all')
  const [filterService, setFilterService] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  const [selectedGap, setSelectedGap] = useState<NetworkGap | null>(null)
  const [matchingProviders, setMatchingProviders] = useState<ProviderMatch[]>([])
  const [isPending, startTransition] = useTransition()

  const filteredGaps = gaps.filter((gap) => {
    if (filterDistrict !== 'all' && gap.district !== filterDistrict) return false
    if (filterService !== 'all' && gap.service !== filterService) return false
    if (filterSeverity !== 'all' && gap.severity !== filterSeverity) return false
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      if (!gap.district.toLowerCase().includes(search) && !gap.service.toLowerCase().includes(search)) {
        return false
      }
    }
    return true
  })

  const handleGapClick = (gap: NetworkGap) => {
    setSelectedGap(gap)
    startTransition(async () => {
      const providers = await findProvidersForGap(gap.district, gap.service)
      setMatchingProviders(providers)
    })
  }

  const criticalCount = gaps.filter((g) => g.severity === 'critical').length
  const warningCount = gaps.filter((g) => g.severity === 'warning').length

  // Get unique districts and services from gaps
  const districtsWithGaps = [...new Set(gaps.map((g) => g.district))].sort()
  const servicesWithGaps = [...new Set(gaps.map((g) => g.service))].sort()

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <Badge variant="destructive" className="text-sm px-3 py-1">
          <AlertTriangle className="h-4 w-4 mr-1" />
          {criticalCount} criticas
        </Badge>
        <Badge variant="warning" className="text-sm px-3 py-1">
          <AlertCircle className="h-4 w-4 mr-1" />
          {warningCount} avisos
        </Badge>
        <span className="text-sm text-muted-foreground">
          {gaps.length} lacunas identificadas
        </span>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar distrito ou servico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={filterDistrict} onValueChange={setFilterDistrict}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Distrito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os distritos</SelectItem>
                {districtsWithGaps.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Servico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os servicos</SelectItem>
                {servicesWithGaps.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Criticas</SelectItem>
                <SelectItem value="warning">Avisos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Gaps List */}
      <div className="space-y-3">
        {filteredGaps.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {gaps.length === 0 ? (
                <>
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Nenhuma lacuna identificada na rede!</p>
                  <p className="text-sm">A cobertura esta adequada em todos os distritos.</p>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4" />
                  <p>Nenhuma lacuna encontrada com os filtros aplicados.</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredGaps.map((gap, index) => (
            <Card
              key={`${gap.district}-${gap.service}`}
              className={`cursor-pointer transition-all hover:shadow-md ${
                gap.severity === 'critical'
                  ? 'border-red-200 bg-red-50 dark:bg-red-950/30'
                  : 'border-orange-200 bg-orange-50 dark:bg-orange-950/30'
              }`}
              onClick={() => handleGapClick(gap)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {gap.severity === 'critical' ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {gap.district}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <Wrench className="h-3 w-3" />
                          {gap.service}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {gap.currentProviders === 0
                          ? 'Sem prestadores ativos'
                          : `Apenas ${gap.currentProviders} prestador${gap.currentProviders > 1 ? 'es' : ''} ativo${gap.currentProviders > 1 ? 's' : ''}`}
                        {' '}(minimo recomendado: {gap.recommendedMinimum})
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Ver solucoes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Matching Providers Dialog */}
      <Dialog open={!!selectedGap} onOpenChange={() => setSelectedGap(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solucoes para lacuna</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {selectedGap?.district}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Wrench className="h-3 w-3" />
                {selectedGap?.service}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          {isPending ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">A procurar prestadores...</p>
            </div>
          ) : matchingProviders.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>Nenhum prestador encontrado para expandir para esta area.</p>
              <p className="text-sm">Considere recrutar novos prestadores para {selectedGap?.district}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {matchingProviders.length} prestador{matchingProviders.length > 1 ? 'es' : ''} que pode{matchingProviders.length > 1 ? 'm' : ''} cobrir esta lacuna:
              </p>

              {matchingProviders.map((provider) => (
                <Card key={provider.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.name}</span>
                          <Badge variant={provider.status === 'ativo' ? 'success' : 'warning'}>
                            {provider.status}
                          </Badge>
                          <Badge variant="secondary">Score: {provider.matchScore}</Badge>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {provider.email}
                          </span>
                          {provider.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {provider.phone}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {provider.matchingServices.length > 0 && (
                            <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950">
                              Ja oferece: {provider.matchingServices.join(', ')}
                            </Badge>
                          )}
                          {provider.matchingDistricts.length > 0 && (
                            <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950">
                              Zonas proximas: {provider.matchingDistricts.join(', ')}
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <span>Servicos atuais: {provider.services.slice(0, 3).join(', ')}</span>
                          {provider.services.length > 3 && <span> +{provider.services.length - 3}</span>}
                          <span className="mx-2">|</span>
                          <span>Zonas: {provider.districts.slice(0, 3).join(', ')}</span>
                          {provider.districts.length > 3 && <span> +{provider.districts.length - 3}</span>}
                        </div>
                      </div>

                      <Link href={`/prestadores/${provider.id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ver ficha
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
