'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Medal, Star, ExternalLink } from 'lucide-react'
import { RANKING_METRICS } from '@/lib/analytics/constants'
import type { ProviderRankingItem, RankingMetric } from '@/lib/analytics/types'

interface UnifiedRankingCardProps {
  data: ProviderRankingItem[]
  currentMetric: RankingMetric
}

function formatValue(value: number | undefined, metric: RankingMetric): string {
  if (value === undefined || value === null) return '-'

  switch (metric) {
    case 'revenue':
    case 'avgTicket':
      return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    case 'acceptance':
    case 'expiration':
      return `${value}%`
    case 'avgRating':
      return value > 0 ? value.toFixed(1) : '-'
    case 'volume':
    default:
      return value.toLocaleString('pt-PT')
  }
}

function getMetricValue(item: ProviderRankingItem, metric: RankingMetric): number {
  switch (metric) {
    case 'volume':
      return item.requestsReceived
    case 'acceptance':
      return item.acceptanceRate
    case 'expiration':
      return item.expirationRate
    case 'revenue':
      return item.revenue || 0
    case 'avgTicket':
      return item.avgTicket || 0
    case 'avgRating':
      return item.avgRating || 0
    default:
      return 0
  }
}

function getRankBadge(rank: number) {
  if (rank === 1) {
    return <Medal className="h-5 w-5 text-yellow-500" />
  }
  if (rank === 2) {
    return <Medal className="h-5 w-5 text-gray-400" />
  }
  if (rank === 3) {
    return <Medal className="h-5 w-5 text-amber-600" />
  }
  return <span className="text-muted-foreground font-medium">{rank}</span>
}

export function UnifiedRankingCard({ data, currentMetric }: UnifiedRankingCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleMetricChange = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('rankingMetric', value)
      router.push(`/analytics?${params.toString()}`)
    })
  }

  const currentMetricInfo = RANKING_METRICS.find((m) => m.value === currentMetric)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Ranking de Prestadores</CardTitle>
              <CardDescription>Top performers por metrica</CardDescription>
            </div>
            <Select value={currentMetric} onValueChange={handleMetricChange} disabled={isPending}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecionar metrica" />
              </SelectTrigger>
              <SelectContent>
                {RANKING_METRICS.map((metric) => (
                  <SelectItem key={metric.value} value={metric.value}>
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Sem dados disponiveis
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Ranking de Prestadores</CardTitle>
            <CardDescription>
              Top {data.length} por {currentMetricInfo?.label.toLowerCase()} - {currentMetricInfo?.description}
            </CardDescription>
          </div>
          <Select value={currentMetric} onValueChange={handleMetricChange} disabled={isPending}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecionar metrica" />
            </SelectTrigger>
            <SelectContent>
              {RANKING_METRICS.map((metric) => (
                <SelectItem key={metric.value} value={metric.value}>
                  {metric.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">#</TableHead>
              <TableHead>Prestador</TableHead>
              <TableHead className="text-right">{currentMetricInfo?.label}</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              {currentMetric !== 'acceptance' && (
                <TableHead className="text-right">Aceitação</TableHead>
              )}
              {currentMetric === 'avgRating' && (
                <TableHead className="text-center">Rating</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.backofficeProviderId}>
                <TableCell className="w-[60px]">
                  <div className="flex items-center justify-center">
                    {getRankBadge(item.rank)}
                  </div>
                </TableCell>
                <TableCell className="font-medium max-w-[200px]">
                  <Link
                    href={`/providers/${item.backofficeProviderId}`}
                    className="hover:underline flex items-center gap-1 group"
                  >
                    <span className="truncate">{item.providerName}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatValue(getMetricValue(item, currentMetric), currentMetric)}
                </TableCell>
                <TableCell className="text-right">
                  {item.requestsReceived.toLocaleString('pt-PT')}
                </TableCell>
                {currentMetric !== 'acceptance' && (
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        item.acceptanceRate >= 70
                          ? 'default'
                          : item.acceptanceRate >= 40
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {item.acceptanceRate}%
                    </Badge>
                  </TableCell>
                )}
                {currentMetric === 'avgRating' && (
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span>{item.avgRating?.toFixed(1) || '-'}</span>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
