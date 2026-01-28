'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Trophy } from 'lucide-react'
import type { TopClient } from '@/lib/analytics/types'

interface TopClientsTableProps {
  data: TopClient[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function TopClientsTable({ data }: TopClientsTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Top Clientes
          </CardTitle>
          <CardDescription>Clientes com mais pedidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Top {data.length} Clientes
        </CardTitle>
        <CardDescription>Ranking por volume de pedidos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Nome</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Cidade</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Pedidos</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Concluídos</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Pagamentos</th>
              </tr>
            </thead>
            <tbody>
              {data.map((client) => (
                <tr key={client.rank} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 px-2">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      client.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                      client.rank === 2 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                      client.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {client.rank}
                    </span>
                  </td>
                  <td className="py-2 px-2 font-medium">{client.name}</td>
                  <td className="py-2 px-2 text-muted-foreground">{client.city || '-'}</td>
                  <td className="py-2 px-2 text-right font-medium">{client.totalRequests.toLocaleString('pt-PT')}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{client.completedRequests.toLocaleString('pt-PT')}</td>
                  <td className="py-2 px-2 text-right font-medium text-green-600">{formatCurrency(client.totalPayments)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
