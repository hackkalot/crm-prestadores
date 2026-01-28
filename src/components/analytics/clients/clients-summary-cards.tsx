'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Users,
  UserCheck,
  BadgeEuro,
  Repeat,
  Wallet,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import type { ClientsSummary } from '@/lib/analytics/types'

interface ClientsSummaryCardsProps {
  data: ClientsSummary
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
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{Math.abs(value)}%</span>
    </div>
  )
}

export function ClientsSummaryCards({ data }: ClientsSummaryCardsProps) {
  const hasTrends = data.totalClientsPrev > 0 || data.totalClientsTrend !== 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Card 1: Total Clientes */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-sm">
                        Número total de clientes registados no período selecionado
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.totalClients.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.totalClientsTrend} />}
                {hasTrends && (
                  <span className="text-xs text-muted-foreground">
                    (ant: {data.totalClientsPrev.toLocaleString('pt-PT')})
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Clientes Ativos */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-sm">
                        Clientes com pedidos nos últimos 6 meses
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Baseado no campo last_request
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.activeClients.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.activeClientsTrend} />}
                <span className="text-xs text-muted-foreground">
                  {data.activeClientsPercentage}% do total
                  {hasTrends && ` (ant: ${data.activeClientsPrev.toLocaleString('pt-PT')})`}
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Ticket Médio / Cliente */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Ticket Médio/Cliente</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        Valor médio de pagamentos por cliente (apenas clientes com pagamentos)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(data.avgPaymentPerClient)}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.avgPaymentPerClientTrend} />}
                {hasTrends && (
                  <span className="text-xs text-muted-foreground">
                    (ant: {formatCurrency(data.avgPaymentPerClientPrev)})
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
              <BadgeEuro className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Recorrências Ativas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Recorrências Ativas</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        Total de recorrências ativas em toda a rede
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.clientsWithRecurrencies} clientes com recorrências ({data.clientsWithRecurrenciesPercentage}%)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.totalRecurrenciesActive.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.totalRecurrenciesActiveTrend} />}
                <span className="text-xs text-muted-foreground">
                  {data.clientsWithRecurrencies} clientes ({data.clientsWithRecurrenciesPercentage}%)
                  {hasTrends && ` (ant: ${data.totalRecurrenciesActivePrev.toLocaleString('pt-PT')})`}
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
              <Repeat className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 5: Wallets Ativas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Wallets Ativas</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        Clientes com wallet ativa
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Saldo médio: {formatCurrency(data.avgWalletBalance)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.walletsActive.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.walletsActiveTrend} />}
                <span className="text-xs text-muted-foreground">
                  {data.walletsActivePercentage}% dos clientes
                  {hasTrends && ` (ant: ${data.walletsActivePrev.toLocaleString('pt-PT')})`}
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-950">
              <Wallet className="h-5 w-5 text-cyan-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
