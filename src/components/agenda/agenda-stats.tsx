import { Card, CardContent } from '@/components/ui/card'
import { ListTodo, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface AgendaStatsProps {
  stats: {
    total: number
    pending: number
    overdue: number
    completedToday: number
  }
}

export function AgendaStats({ stats }: AgendaStatsProps) {
  const items = [
    {
      label: 'Total de Tarefas',
      value: stats.total,
      icon: ListTodo,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Pendentes',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Em Atraso',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      label: 'Concluidas Hoje',
      value: stats.completedToday,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${item.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
