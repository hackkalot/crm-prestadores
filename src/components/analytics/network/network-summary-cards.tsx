'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Star,
  UserX,
  CalendarSync,
  BadgeEuro,
  HelpCircle,
} from 'lucide-react'
import type { NetworkKPIs } from '@/lib/analytics/types'

interface NetworkSummaryCardsProps {
  data: NetworkKPIs
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function TrendIndicator({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const isPositive = inverted ? value < 0 : value > 0
  const isNeutral = value === 0

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
  const colorClass = isNeutral
    ? 'text-muted-foreground'
    : isPositive
      ? 'text-green-600'
      : 'text-red-600'

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{Math.abs(value)}%</span>
    </div>
  )
}

export function NetworkSummaryCards({ data }: NetworkSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Card 1: Nº médio serviços por prestador */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Média Serviços/Prestador</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-sm">
                        Número médio de serviços atribuídos por prestador no período
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.totalServices.toLocaleString('pt-PT')} serviços / {data.uniqueProviders} prestadores
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.avgServicesPerProvider}</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.avgServicesPerProviderTrend} />
                <span className="text-xs text-muted-foreground">
                  (ant: {data.avgServicesPerProviderPrev})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.uniqueProviders} prestadores ativos
              </p>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Ratings (Técnico vs Serviço lado a lado) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Ratings</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px]">
                      <p className="text-sm font-medium mb-1">Comparação de Ratings</p>
                      <p className="text-xs">
                        <strong>Técnico:</strong> Avaliação do técnico (<code>technician_rating</code>)
                      </p>
                      <p className="text-xs">
                        <strong>Serviço:</strong> Avaliação do serviço (<code>service_rating</code>)
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Técnico: {data.totalTechnicianRatings.toLocaleString('pt-PT')} avaliações
                        <br />
                        Serviço: {data.totalServiceRatings.toLocaleString('pt-PT')} avaliações
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Two ratings side by side */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                {/* Technician Rating */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Técnico</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold">{data.avgTechnicianRating || '-'}</p>
                    {data.avgTechnicianRating > 0 && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {data.avgTechnicianRating > 0 ? (
                      <>
                        <TrendIndicator value={data.avgTechnicianRatingTrend} />
                        <span className="text-[10px] text-muted-foreground">
                          ({data.avgTechnicianRatingPrev})
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">-</span>
                    )}
                  </div>
                </div>

                {/* Service Rating */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Serviço</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold">{data.avgServiceRating || '-'}</p>
                    {data.avgServiceRating > 0 && <Star className="h-4 w-4 text-blue-500 fill-blue-500" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {data.avgServiceRating > 0 ? (
                      <>
                        <TrendIndicator value={data.avgServiceRatingTrend} />
                        <span className="text-[10px] text-muted-foreground">
                          ({data.avgServiceRatingPrev})
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground mt-1">
                {data.totalTechnicianRatings.toLocaleString('pt-PT')} / {data.totalServiceRatings.toLocaleString('pt-PT')} avaliações
              </p>
            </div>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
              <Star className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Taxa de cancelamento por indisponibilidade */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Cancel. Indisponibilidade</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        Percentagem de serviços cancelados por &quot;Indisponibilidade de prestadores&quot;
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.providerCancellationCount} de {data.totalCancellations} cancelamentos
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.providerCancellationRate}%</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.providerCancellationRateTrend} inverted />
                <span className="text-xs text-muted-foreground">
                  (ant: {data.providerCancellationRatePrev}%)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.providerCancellationCount} cancelamentos
              </p>
            </div>
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950">
              <UserX className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Reagendamentos */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Reagendamentos</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-sm">
                        Serviços reagendados pelo backoffice (<code>reschedule_bo = true</code>)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.rescheduleRate}% dos serviços no período
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.rescheduleCount.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.rescheduleCountTrend} inverted />
                <span className="text-xs text-muted-foreground">
                  (ant: {data.rescheduleCountPrev.toLocaleString('pt-PT')})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.rescheduleRate}% dos serviços
              </p>
            </div>
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950">
              <CalendarSync className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 5: Custos Adicionais */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Custos Adicionais</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        Serviços com custos adicionais (<code>net_additional_charges &gt; 0</code>)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Valor total: {formatCurrency(data.totalAdditionalChargesValue)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.additionalChargesCount.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.additionalChargesCountTrend} inverted />
                <span className="text-xs text-muted-foreground">
                  (ant: {data.additionalChargesCountPrev.toLocaleString('pt-PT')})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.additionalChargesRate}% dos serviços ({formatCurrency(data.totalAdditionalChargesValue)})
              </p>
            </div>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
              <BadgeEuro className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
