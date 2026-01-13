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
  Send,
  CheckCircle2,
  Percent,
  Receipt,
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

function formatCurrencyWithDecimals(value: number): { integer: string; decimal: string } {
  const formatted = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  const parts = formatted.split(',')
  return {
    integer: parts[0],
    decimal: parts[1] || '00',
  }
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
      {/* Pedidos de Serviço (service_requests reais) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pedidos de Serviço</p>
              <p className="text-3xl font-bold">{data.totalServiceRequests.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.serviceRequestsTrend} />
                <span className="text-xs text-muted-foreground">
                  (ant: {data.totalServiceRequestsPrevPeriod.toLocaleString('pt-PT')})
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pedidos Enviados (oferecidos aos prestadores) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pedidos Enviados</p>
              <p className="text-3xl font-bold">{data.totalSentRequests.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.sentRequestsTrend} />
                <span className="text-xs text-muted-foreground">
                  (ant: {data.totalSentRequestsPrevPeriod.toLocaleString('pt-PT')})
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950">
              <Send className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pedidos Aceites (realmente alocados) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pedidos Aceites</p>
              <p className="text-3xl font-bold">{data.totalAcceptedRequests.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.acceptedRequestsTrend} />
                <span className="text-xs text-muted-foreground">
                  (ant: {data.totalAcceptedRequestsPrevPeriod.toLocaleString('pt-PT')})
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Taxa de Aceitação */}
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

      {/* Ticket Médio */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        <strong>Teórico:</strong> Revenue ÷ Pedidos de Serviço
                      </p>
                      <p className="text-sm mt-1">
                        <strong>Faturação:</strong> {formatCurrency(data.avgTicketBilling)} ({data.billingProcessesCount.toLocaleString('pt-PT')} processos)
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        A diferença existe porque nem todos os pedidos têm processo de faturação associado.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">
                {formatCurrencyWithDecimals(data.avgTicket).integer}
                <span className="text-lg">,{formatCurrencyWithDecimals(data.avgTicket).decimal} €</span>
              </p>
              <div className="flex items-center gap-2">
                <TrendIndicator value={data.avgTicketTrend} />
                <span className="text-xs text-muted-foreground">
                  (ant: {formatCurrency(data.avgTicketPrevPeriod)})
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
              <Receipt className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Total */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Revenue Total</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        <strong>Teórico:</strong> Soma de paid_amount dos pedidos
                      </p>
                      <p className="text-sm mt-1">
                        <strong>Faturação:</strong> {formatCurrency(data.totalRevenueBilling)} ({data.billingProcessesCount.toLocaleString('pt-PT')} processos)
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        A diferença existe porque nem todos os pedidos têm processo de faturação associado.
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
