import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Clock,
  TrendingUp,
  FileText,
  Zap,
  AlertTriangle,
} from 'lucide-react'

interface OnboardingTotals {
  total: number
  normal: number
  urgente: number
}

interface AverageTime {
  averageDays: number
  medianDays: number
  count: number
  normalAverage: number
  urgenteAverage: number
}

interface ConversionFunnel {
  candidaturas: number
  emOnboarding: number
  ativos: number
  abandonados: number
  taxaConversao: number
}

interface KpiCardsProps {
  onboardingTotals: OnboardingTotals
  candidaturasPending: number
  averageTime: AverageTime
  conversionFunnel: ConversionFunnel
}

export function KpiCards({
  onboardingTotals,
  candidaturasPending,
  averageTime,
  conversionFunnel,
}: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Em Onboarding */}
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
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Normal: {onboardingTotals.normal}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Urgente: {onboardingTotals.urgente}
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidaturas por Tratar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Candidaturas por Tratar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{candidaturasPending}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardam decisao
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <FileText className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tempo Medio */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tempo Medio Onboarding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">
                {averageTime.averageDays > 0 ? `${averageTime.averageDays}d` : '-'}
              </p>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span>Mediana: {averageTime.medianDays > 0 ? `${averageTime.medianDays}d` : '-'}</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Taxa de Conversao */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Taxa de Conversao
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{conversionFunnel.taxaConversao}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {conversionFunnel.ativos} ativos de {conversionFunnel.candidaturas}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente separado para comparacao Normal vs Urgente
export function TimeComparisonCard({ averageTime }: { averageTime: AverageTime }) {
  if (averageTime.count === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comparacao Normal vs Urgente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Onboarding Normal</span>
            </div>
            <p className="text-2xl font-bold">
              {averageTime.normalAverage > 0 ? `${averageTime.normalAverage} dias` : '-'}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Onboarding Urgente</span>
            </div>
            <p className="text-2xl font-bold">
              {averageTime.urgenteAverage > 0 ? `${averageTime.urgenteAverage} dias` : '-'}
            </p>
          </div>
        </div>
        {averageTime.normalAverage > 0 && averageTime.urgenteAverage > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {averageTime.urgenteAverage < averageTime.normalAverage ? (
                <span className="text-green-600">
                  Urgente e {Math.round(((averageTime.normalAverage - averageTime.urgenteAverage) / averageTime.normalAverage) * 100)}% mais rapido
                </span>
              ) : averageTime.urgenteAverage > averageTime.normalAverage ? (
                <span className="text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Urgente esta mais lento que normal
                </span>
              ) : (
                <span>Tempos iguais</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
