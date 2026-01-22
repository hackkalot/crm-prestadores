import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Clock,
  TrendingUp,
  Phone,
  CheckCircle,
  UserCheck,
} from 'lucide-react'

interface OnboardingTotals {
  total: number
  normal: number
  urgente: number
}

interface ConversionFunnel {
  candidaturas: number
  emOnboarding: number
  ativos: number
  abandonados: number
  taxaConversao: number
}

interface AvgTimeToNetwork {
  days: number
  count: number
}

interface KpiCardsProps {
  onboardingTotals: OnboardingTotals
  tasksCompleted: number
  contactsMade: number
  providersWorked: number
  avgTimeToNetwork: AvgTimeToNetwork
}

export function KpiCards({
  onboardingTotals,
  tasksCompleted,
  contactsMade,
  providersWorked,
  avgTimeToNetwork,
}: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Prestadores enviados para Onboarding */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Em Onboarding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{onboardingTotals.total}</p>
              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {onboardingTotals.normal}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  {onboardingTotals.urgente}
                </span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Tarefas Concluidas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tarefas Concluidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{tasksCompleted}</p>
              <p className="text-xs text-muted-foreground mt-1">
                No periodo
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Contactos Feitos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Contactos Feitos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{contactsMade}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tarefas &quot;Ligar&quot;
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Prestadores Trabalhados */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Prestadores Trabalhados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{providersWorked}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Com atividade
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Tempo Medio Entrada na Rede */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tempo Medio Rede
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">
                {avgTimeToNetwork.days > 0 ? `${avgTimeToNetwork.days}d` : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {avgTimeToNetwork.count > 0 ? `${avgTimeToNetwork.count} entradas` : 'Sem dados'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
