'use client'

import { useState, useCallback, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  CheckCircle2,
  Euro,
  Star,
  BarChart3,
} from 'lucide-react'
import {
  getProviderPerformance,
  getNetworkBenchmark,
  type ProviderPerformance,
  type NetworkBenchmark,
  type ProviderPerformanceFilters,
} from '@/lib/providers/performance-actions'

interface PerformanceTabProps {
  backofficeProviderId: number
  initialPerformance: ProviderPerformance
  initialBenchmark: NetworkBenchmark
}

const STATUS_COLORS: Record<string, string> = {
  'Concluído': '#22c55e',
  'Novo pedido': '#f59e0b',
  'Atribuir prestador': '#f97316',
  'Prestador atribuído': '#3b82f6',
  'Cancelado pelo cliente': '#ef4444',
  'Cancelado pelo backoffice': '#dc2626',
  'Cancelado pelo prestador': '#b91c1c',
}

const RATING_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e']

const DATE_PRESETS = [
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '1 ano', days: 365 },
  { label: 'Sempre', days: 0 },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('pt-PT', { month: 'short' })
}

export function PerformanceTab({
  backofficeProviderId,
  initialPerformance,
  initialBenchmark,
}: PerformanceTabProps) {
  const [isPending, startTransition] = useTransition()
  const [performance, setPerformance] = useState(initialPerformance)
  const [benchmark, setBenchmark] = useState(initialBenchmark)
  const [selectedPreset, setSelectedPreset] = useState<number>(0) // 0 = Sempre

  const handlePresetChange = useCallback(
    (days: number) => {
      setSelectedPreset(days)
      startTransition(async () => {
        const filters: ProviderPerformanceFilters = {}
        if (days > 0) {
          const dateFrom = new Date()
          dateFrom.setDate(dateFrom.getDate() - days)
          filters.dateFrom = dateFrom.toISOString().split('T')[0]
        }

        const [newPerformance, newBenchmark] = await Promise.all([
          getProviderPerformance(backofficeProviderId, filters),
          getNetworkBenchmark(filters),
        ])
        setPerformance(newPerformance)
        setBenchmark(newBenchmark)
      })
    },
    [backofficeProviderId]
  )

  const TrendIcon =
    performance.trend === 'up'
      ? TrendingUp
      : performance.trend === 'down'
        ? TrendingDown
        : Minus

  const trendColor =
    performance.trend === 'up'
      ? 'text-green-600'
      : performance.trend === 'down'
        ? 'text-red-600'
        : 'text-muted-foreground'

  // No data state
  if (performance.totalRequests === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Sem dados de performance</p>
          <p className="text-sm text-muted-foreground mt-1">
            Este prestador ainda nao tem pedidos para analisar
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date preset buttons */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.days}
            variant={selectedPreset === preset.days ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetChange(preset.days)}
            disabled={isPending}
          >
            {preset.label}
          </Button>
        ))}
        {isPending && (
          <span className="text-sm text-muted-foreground ml-2">A carregar...</span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pedidos */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pedidos</p>
                <p className="text-3xl font-bold">{performance.totalRequests}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                  <span className={`text-sm ${trendColor}`}>
                    {performance.trendPercentage}%
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Rede: {benchmark.medianRequestsPerProvider} (mediana)
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Conclusao */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa Conclusão</p>
                <p className="text-3xl font-bold">{performance.completionRate}%</p>
                <Badge
                  variant={
                    performance.completionRate >= benchmark.avgCompletionRate
                      ? 'default'
                      : 'secondary'
                  }
                  className="mt-1"
                >
                  {performance.completionRate >= benchmark.avgCompletionRate
                    ? 'Acima da media'
                    : 'Abaixo da media'}
                </Badge>
              </div>
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Rede: {benchmark.avgCompletionRate}%
            </p>
          </CardContent>
        </Card>

        {/* Ticket Medio */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-3xl font-bold">{formatCurrency(performance.avgTicket)}</p>
                <Badge
                  variant={
                    performance.avgTicket >= benchmark.avgTicket ? 'default' : 'secondary'
                  }
                  className="mt-1"
                >
                  {performance.avgTicket >= benchmark.avgTicket
                    ? 'Acima da media'
                    : 'Abaixo da media'}
                </Badge>
              </div>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
                <Euro className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Rede: {formatCurrency(benchmark.avgTicket)}
            </p>
          </CardContent>
        </Card>

        {/* Rating */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avaliação</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-bold">
                    {performance.avgRating !== null ? performance.avgRating : '-'}
                  </p>
                  {performance.avgRating !== null && (
                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  )}
                </div>
                {performance.avgRating !== null && (
                  <Badge
                    variant={
                      performance.avgRating >= benchmark.avgRating ? 'default' : 'secondary'
                    }
                    className="mt-1"
                  >
                    {performance.avgRating >= benchmark.avgRating
                      ? 'Acima da media'
                      : 'Abaixo da media'}
                  </Badge>
                )}
              </div>
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Rede: {benchmark.avgRating} ({performance.totalRatings} avaliações)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendência Mensal</CardTitle>
            <CardDescription>Pedidos por mês nos últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performance.requestsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg p-3">
                            <p className="font-medium text-sm">{label}</p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Pedidos: </span>
                              <span className="font-bold">{payload[0].value}</span>
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Estado</CardTitle>
            <CardDescription>Pedidos agrupados por estado atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performance.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    label={({ percent }) =>
                      (percent as number) > 0.05 ? `${Math.round((percent as number) * 100)}%` : ''
                    }
                  >
                    {performance.statusBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg p-3">
                            <p className="font-medium text-sm">{data.status}</p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Pedidos: </span>
                              <span className="font-bold">{data.count}</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Percentagem: </span>
                              <span className="font-bold">{data.percentage}%</span>
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita por Categoria</CardTitle>
            <CardDescription>
              Total: {formatCurrency(performance.totalRevenue)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {performance.revenueByCategory.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem dados de receita
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performance.revenueByCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => formatCurrency(value)}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={100}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="font-medium text-sm">{data.category}</p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">Receita: </span>
                                <span className="font-bold">
                                  {formatCurrency(data.revenue)}
                                </span>
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Avaliações</CardTitle>
            <CardDescription>{performance.totalRatings} avaliações recebidas</CardDescription>
          </CardHeader>
          <CardContent>
            {performance.ratingDistribution.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem avaliações
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performance.ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="rating"
                      tickFormatter={(value) => `${value}★`}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="font-medium text-sm">{data.rating} estrelas</p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">Quantidade: </span>
                                <span className="font-bold">{data.count}</span>
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {performance.ratingDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RATING_COLORS[entry.rating - 1]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional metrics */}
      {performance.avgExecutionDays !== null && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Tempo médio de Execução (pedidos concluídos)
                </p>
                <p className="text-2xl font-bold">{performance.avgExecutionDays} dias</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Média da rede</p>
                <p className="text-lg font-medium">{benchmark.avgExecutionDays} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
