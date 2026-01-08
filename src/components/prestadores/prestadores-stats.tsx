import { Card, CardContent } from '@/components/ui/card'
import { Users, UserCheck, UserX, UserPlus, Clock, Ban } from 'lucide-react'

interface PrestadoresStatsProps {
  stats: {
    novo: number
    em_onboarding: number
    ativo: number
    suspenso: number
    abandonado: number
    total: number
  }
}

export function PrestadoresStats({ stats }: PrestadoresStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.novo}</p>
            <p className="text-sm text-muted-foreground">Novos</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.em_onboarding}</p>
            <p className="text-sm text-muted-foreground">Em Onboarding</p>
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
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <UserX className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.suspenso}</p>
            <p className="text-sm text-muted-foreground">Suspensos</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center">
            <Ban className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.abandonado}</p>
            <p className="text-sm text-muted-foreground">Abandonados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
