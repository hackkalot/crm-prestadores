'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Users, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react'

interface AllocationStatsProps {
  stats: {
    totalProviders: number
    totalReceived: number
    totalAccepted: number
    totalRejected: number
    totalExpired: number
    acceptanceRate: number
    period: {
      from: string
      to: string
    } | null
  }
}

export function AlocacoesStats({ stats }: AllocationStatsProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-4">
      {stats.period && (
        <div className="text-sm text-muted-foreground">
          Período: {formatDate(stats.period.from)} - {formatDate(stats.period.to)}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prestadores</p>
                <p className="text-2xl font-bold">{stats.totalProviders}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pedidos Recebidos</p>
                <p className="text-2xl font-bold">{stats.totalReceived.toLocaleString('pt-PT')}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aceites</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalAccepted.toLocaleString('pt-PT')}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejeitados</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalRejected.toLocaleString('pt-PT')}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expirados</p>
                <p className="text-2xl font-bold text-amber-600">{stats.totalExpired.toLocaleString('pt-PT')}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.totalReceived > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Taxa de Aceitação */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Taxa de Aceitação</span>
              <span className="text-xl font-bold text-green-600">{stats.acceptanceRate}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted-foreground/20">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${stats.acceptanceRate}%` }}
              />
            </div>
          </div>

          {/* Taxa de Rejeição */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Taxa de Rejeição</span>
              <span className="text-xl font-bold text-red-600">
                {Math.round((stats.totalRejected / stats.totalReceived) * 100)}%
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted-foreground/20">
              <div
                className="h-2 rounded-full bg-red-500 transition-all"
                style={{ width: `${Math.round((stats.totalRejected / stats.totalReceived) * 100)}%` }}
              />
            </div>
          </div>

          {/* Taxa de Expiração */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Taxa de Expiração</span>
              <span className="text-xl font-bold text-amber-600">
                {Math.round((stats.totalExpired / stats.totalReceived) * 100)}%
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted-foreground/20">
              <div
                className="h-2 rounded-full bg-amber-500 transition-all"
                style={{ width: `${Math.round((stats.totalExpired / stats.totalReceived) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
