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
  FileText,
  CalendarClock,
  Percent,
  Users,
  Star,
  Euro,
  HelpCircle,
} from 'lucide-react'
import type { OperationalSummary } from '@/lib/analytics/types'

interface AnalyticsSummaryCardsProps {
  data: OperationalSummary
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

export function AnalyticsSummaryCards({ data }: AnalyticsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Card 1: Pedidos Submetidos (created_at) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Pedidos Submetidos</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p className="text-sm">
                        Pedidos criados no período (por <code>created_at</code>)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.totalServiceRequests.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.serviceRequestsTrend} />
                <span className="text-xs text-muted-foreground">
                  (ant: {data.totalServiceRequestsPrevPeriod.toLocaleString('pt-PT')})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Média: <span className="font-medium">{data.avgRequestsPerDaySubmitted}</span>/dia
              </p>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Pedidos Agendados (scheduled_to) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Pedidos Agendados</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p className="text-sm">
                        Pedidos agendados para o período (por <code>scheduled_to</code>)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.totalScheduledRequests.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.scheduledRequestsTrend} />
                <span className="text-xs text-muted-foreground">
                  (ant: {data.totalScheduledRequestsPrevPeriod.toLocaleString('pt-PT')})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Média: <span className="font-medium">{data.avgRequestsPerDayScheduled}</span>/dia
              </p>
            </div>
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950">
              <CalendarClock className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Taxa de Aceitação */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Taxa de Aceitação</p>
              <p className="text-3xl font-bold">{data.networkAcceptanceRate}%</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.acceptanceTrend} />
                <span className="text-xs text-muted-foreground">
                  (ant: {data.networkAcceptanceRatePrevMonth}%)
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-950">
              <Percent className="h-5 w-5 text-cyan-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Prestadores Ativos */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Prestadores Ativos</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-sm">
                        Prestadores únicos com serviços atribuídos no período
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total na rede: {data.totalProvidersInNetwork} prestadores
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.activeProvidersInPeriod}</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.activeProvidersTrend} />
                <span className="text-xs text-muted-foreground">
                  (ant: {data.activeProvidersInPeriodPrev})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                de {data.totalProvidersInNetwork} na rede
              </p>
            </div>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 5: Satisfação (Rating) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Satisfação</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p className="text-sm">
                        Rating médio dos serviços avaliados no período
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.totalRatingsCount} avaliações
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold">{data.avgRating || '-'}</p>
                {data.avgRating > 0 && <Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
              </div>
              <div className="flex items-center gap-2">
                {data.avgRating > 0 ? (
                  <>
                    <TrendIndicator value={data.avgRatingTrend} />
                    <span className="text-xs text-muted-foreground">
                      (ant: {data.avgRatingPrevPeriod})
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Sem avaliações</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.totalRatingsCount} avaliações
              </p>
            </div>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
              <Star className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 6: Receita Total (placeholder até P&L) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        Receita teórica (soma de <code>paid_amount</code>)
                      </p>
                      <p className="text-sm mt-1">
                        <strong>Faturação real:</strong> {formatCurrency(data.totalRevenueBilling)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ticket médio: {formatCurrency(data.avgTicket)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(data.totalRevenue)}</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.revenueTrend} />
                <span className="text-xs text-muted-foreground">
                  (ant: {formatCurrency(data.totalRevenuePrevMonth)})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ticket médio: {formatCurrency(data.avgTicket)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <Euro className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
