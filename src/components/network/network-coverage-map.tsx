'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { CoverageData } from '@/lib/network/actions'
import { MapPin, Users, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface NetworkCoverageMapProps {
  coverage: CoverageData[]
}

export function NetworkCoverageMap({ coverage }: NetworkCoverageMapProps) {
  const [selectedDistrict, setSelectedDistrict] = useState<CoverageData | null>(null)

  const getCoverageColor = (data: CoverageData) => {
    if (data.activeProviders === 0) return 'bg-red-100 dark:bg-red-950 border-red-300'
    if (data.hasGaps) return 'bg-orange-100 dark:bg-orange-950 border-orange-300'
    return 'bg-green-100 dark:bg-green-950 border-green-300'
  }

  const getCoverageIcon = (data: CoverageData) => {
    if (data.activeProviders === 0) return <AlertTriangle className="h-4 w-4 text-red-600" />
    if (data.hasGaps) return <AlertTriangle className="h-4 w-4 text-orange-600" />
    return <CheckCircle2 className="h-4 w-4 text-green-600" />
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Legend */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-950 border border-green-300" />
            <span>Cobertura completa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-950 border border-orange-300" />
            <span>Com lacunas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-950 border border-red-300" />
            <span>Sem cobertura</span>
          </div>
        </div>

        {/* District Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {coverage.map((data) => (
            <Tooltip key={data.district}>
              <TooltipTrigger asChild>
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${getCoverageColor(data)}`}
                  onClick={() => setSelectedDistrict(data)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{data.district}</span>
                      </div>
                      {getCoverageIcon(data)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {data.activeProviders} ativos
                      </span>
                    </div>
                    {data.hasGaps && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {data.gapServices.length} lacuna{data.gapServices.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{data.district}</p>
                  <p className="text-xs">{data.totalProviders} prestadores ({data.activeProviders} ativos)</p>
                  {data.gapServices.length > 0 && (
                    <p className="text-xs text-orange-500">
                      Lacunas: {data.gapServices.slice(0, 3).join(', ')}
                      {data.gapServices.length > 3 && ` +${data.gapServices.length - 3}`}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* District Detail Dialog */}
        <Dialog open={!!selectedDistrict} onOpenChange={() => setSelectedDistrict(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {selectedDistrict?.district}
              </DialogTitle>
              <DialogDescription>
                Detalhes de cobertura por servico
              </DialogDescription>
            </DialogHeader>

            {selectedDistrict && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{selectedDistrict.totalProviders}</p>
                      <p className="text-xs text-muted-foreground">Total prestadores</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{selectedDistrict.activeProviders}</p>
                      <p className="text-xs text-muted-foreground">Ativos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-orange-600">{selectedDistrict.gapServices.length}</p>
                      <p className="text-xs text-muted-foreground">Lacunas</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Services */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Cobertura por Servico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedDistrict.services.map((serviceData) => {
                        const activeCount = serviceData.providers.filter((p) => p.status === 'ativo').length
                        const isGap = activeCount < 2

                        return (
                          <div
                            key={serviceData.service}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              isGap ? 'bg-orange-50 dark:bg-orange-950' : 'bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isGap ? (
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                              <span className="text-sm">{serviceData.service}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={isGap ? 'warning' : 'secondary'}>
                                {activeCount} ativo{activeCount !== 1 ? 's' : ''}
                              </Badge>
                              {serviceData.providers.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 px-2">
                                      <Users className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-xs">
                                    <p className="font-medium mb-1">Prestadores:</p>
                                    {serviceData.providers.slice(0, 5).map((p) => (
                                      <p key={p.id} className="text-xs">
                                        {p.name} ({p.status})
                                      </p>
                                    ))}
                                    {serviceData.providers.length > 5 && (
                                      <p className="text-xs text-muted-foreground">
                                        +{serviceData.providers.length - 5} mais
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Gap Actions */}
                {selectedDistrict.hasGaps && (
                  <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Lacunas identificadas</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedDistrict.gapServices.length} servico{selectedDistrict.gapServices.length > 1 ? 's' : ''} com cobertura insuficiente
                          </p>
                        </div>
                        <Link href={`/rede?tab=lacunas&district=${selectedDistrict.district}`}>
                          <Button size="sm">
                            Ver solucoes
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
