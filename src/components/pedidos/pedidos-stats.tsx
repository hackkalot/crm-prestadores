'use client'

import { Card, CardContent } from '@/components/ui/card'
import { FileText, Clock, UserCheck, CheckCircle, XCircle } from 'lucide-react'
import type { ServiceRequestStats } from '@/lib/service-requests/actions'

interface PedidosStatsProps {
  stats: ServiceRequestStats
}

export function PedidosStats({ stats }: PedidosStatsProps) {
  const cards = [
    {
      label: 'Total Pedidos',
      value: stats.total,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Novos Pedidos',
      value: stats.novoPedido,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'A Atribuir',
      value: stats.atribuirPrestador,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Atribuídos',
      value: stats.prestadorAtribuido,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Concluídos',
      value: stats.concluido,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Cancelados',
      value: stats.cancelado,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
