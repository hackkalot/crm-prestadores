import { Card, CardContent } from '@/components/ui/card'
import { Users, Zap, Clock, AlertTriangle } from 'lucide-react'

interface OnboardingStatsProps {
  stats: {
    total: number
    normal: number
    urgente: number
    atrasadas: number
  }
}

export function OnboardingStats({ stats }: OnboardingStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Em Onboarding</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.normal}</p>
              <p className="text-xs text-muted-foreground">Normal</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.urgente}</p>
              <p className="text-xs text-muted-foreground">Urgente</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.atrasadas}</p>
              <p className="text-xs text-muted-foreground">Atrasados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
