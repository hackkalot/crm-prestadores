'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Receipt,
  Clock,
  Search,
  XCircle,
  CheckCircle,
  Banknote,
  Archive,
  Euro,
} from 'lucide-react'
import type { BillingStats } from '@/lib/billing/actions'

interface FaturacaoStatsProps {
  stats: BillingStats
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function FaturacaoStats({ stats }: FaturacaoStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total.toLocaleString('pt-PT')}</div>
          <p className="text-xs text-muted-foreground">processos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Por Enviar</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.porEnviar.toLocaleString('pt-PT')}</div>
          <p className="text-xs text-muted-foreground">aguardam envio</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
          <Search className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.emAnalise.toLocaleString('pt-PT')}</div>
          <p className="text-xs text-muted-foreground">em revisão</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Não Aceite</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.naoAceite.toLocaleString('pt-PT')}</div>
          <p className="text-xs text-muted-foreground">rejeitados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aceite</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.aceite.toLocaleString('pt-PT')}</div>
          <p className="text-xs text-muted-foreground">aprovados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pago</CardTitle>
          <Banknote className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pago.toLocaleString('pt-PT')}</div>
          <p className="text-xs text-muted-foreground">pagos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Arquivado</CardTitle>
          <Archive className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.arquivado.toLocaleString('pt-PT')}</div>
          <p className="text-xs text-muted-foreground">arquivados</p>
        </CardContent>
      </Card>

      <Card className="bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Pago</CardTitle>
          <Euro className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-primary">
            {formatCurrency(stats.paidValue)}
          </div>
          <p className="text-xs text-muted-foreground">
            de {formatCurrency(stats.totalValue)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
