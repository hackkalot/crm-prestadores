'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trophy, Medal } from 'lucide-react'
import type { ProviderRankingItem } from '@/lib/analytics/types'

interface ProviderRankingTableProps {
  data: ProviderRankingItem[]
  title?: string
  description?: string
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center">
        <Trophy className="h-5 w-5 text-amber-500" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center">
        <Medal className="h-5 w-5 text-slate-400" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center">
        <Medal className="h-5 w-5 text-amber-700" />
      </div>
    )
  }
  return (
    <span className="text-muted-foreground font-medium">{rank}</span>
  )
}

export function ProviderRankingTable({
  data,
  title = 'Top Prestadores',
  description = 'Ranking por taxa de aceitação',
}: ProviderRankingTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Prestador</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Aceitação</TableHead>
                <TableHead className="text-right">Expiração</TableHead>
                <TableHead className="text-right">Resposta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((provider) => (
                <TableRow key={provider.backofficeProviderId}>
                  <TableCell className="text-center">
                    <RankBadge rank={provider.rank} />
                  </TableCell>
                  <TableCell className="font-medium max-w-[180px] truncate">
                    {provider.providerName}
                  </TableCell>
                  <TableCell className="text-right">{provider.requestsReceived}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={provider.acceptanceRate >= 70 ? 'default' : 'secondary'}
                      className={
                        provider.acceptanceRate >= 70
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : provider.acceptanceRate >= 40
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                            : ''
                      }
                    >
                      {provider.acceptanceRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        provider.expirationRate > 30
                          ? 'text-red-600 font-medium'
                          : provider.expirationRate > 20
                            ? 'text-amber-600'
                            : 'text-muted-foreground'
                      }
                    >
                      {provider.expirationRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {provider.avgResponseTime || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
