import { Card, CardContent } from '@/components/ui/card'
import { Users, Clock, XCircle } from 'lucide-react'

interface StatsCardsProps {
  stats: {
    novo: number
    em_onboarding: number
    abandonado: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const items = [
    {
      label: 'Novas Candidaturas',
      value: stats.novo,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Em Onboarding',
      value: stats.em_onboarding,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Abandonados',
      value: stats.abandonado,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-lg ${item.bg} flex items-center justify-center`}>
              <item.icon className={`h-6 w-6 ${item.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-sm text-muted-foreground">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
