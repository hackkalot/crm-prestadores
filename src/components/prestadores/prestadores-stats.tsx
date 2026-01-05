import { Card, CardContent } from '@/components/ui/card'
import { Users, UserCheck, UserX } from 'lucide-react'

interface PrestadoresStatsProps {
  stats: {
    ativo: number
    suspenso: number
    total: number
  }
}

export function PrestadoresStats({ stats }: PrestadoresStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Prestadores</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.ativo}</p>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <UserX className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.suspenso}</p>
            <p className="text-sm text-muted-foreground">Suspensos</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
