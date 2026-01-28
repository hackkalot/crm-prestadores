'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Repeat,
  CheckCircle2,
  XCircle,
  Wrench,
  MapPin,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import type { RecurrencesSummary } from '@/lib/analytics/types'

interface RecurrencesSummaryCardsProps {
  data: RecurrencesSummary
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

export function RecurrencesSummaryCards({ data }: RecurrencesSummaryCardsProps) {
  const hasTrends = data.totalRecurrencesPrev > 0 || data.totalRecurrencesTrend !== 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Card 1: Total Recorrências */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Total Recorrências</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-sm">
                        Recorrências criadas no período selecionado (por submission_date)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.totalRecurrences.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.totalRecurrencesTrend} />}
                {hasTrends && (
                  <span className="text-xs text-muted-foreground">
                    (ant: {data.totalRecurrencesPrev.toLocaleString('pt-PT')})
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
              <Repeat className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Recorrências Ativas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Ativas</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-sm">
                        Recorrências com status &quot;Active&quot;
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.activeRecurrences.toLocaleString('pt-PT')}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.activeRecurrencesTrend} />}
                <span className="text-xs text-muted-foreground">
                  {data.activePercentage}% do total
                  {hasTrends && ` (ant: ${data.activeRecurrencesPrev.toLocaleString('pt-PT')})`}
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Taxa de Inativação */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Taxa Inativação</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        Percentagem de recorrências inativas no período
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.inactivationRate}%</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.inactivationRateTrend} inverted />}
                <span className="text-xs text-muted-foreground">
                  {data.inactivatedCount.toLocaleString('pt-PT')} inativadas
                  {hasTrends && ` (ant: ${data.inactivationRatePrev}%)`}
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Serviços Distintos */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Serviços Distintos</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        Tipos de serviço distintos nas recorrências do período
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.distinctServices}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.distinctServicesTrend} />}
                {data.topService && (
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={data.topService}>
                    Top: {data.topService}
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
              <Wrench className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 5: Concelhos Cobertos */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Concelhos</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      <p className="text-sm">
                        Concelhos distintos com recorrências no período
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{data.distinctDistricts}</p>
              <div className="flex items-center gap-2 mt-1">
                {hasTrends && <TrendIndicator value={data.distinctDistrictsTrend} />}
                {data.topDistrict && (
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={data.topDistrict}>
                    Top: {data.topDistrict}
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
