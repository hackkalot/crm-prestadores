'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Clock, TrendingUp, Database } from 'lucide-react'

interface StatsProps {
  totalMappings?: number
  verifiedMappings?: number
  pendingSuggestions?: number
  algorithmAccuracy?: number
  totalFeedback?: number
  error?: string
}

export function ServiceMappingStats({ stats }: { stats: StatsProps }) {
  if (stats.error) {
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Mapeamentos</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalMappings || 0}</div>
          <p className="text-xs text-muted-foreground">
            Serviços mapeados na taxonomia
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Verificados</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.verifiedMappings || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalMappings
              ? `${Math.round(((stats.verifiedMappings || 0) / stats.totalMappings) * 100)}% do total`
              : 'Confirmados por utilizadores'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          <Clock className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingSuggestions || 0}</div>
          <p className="text-xs text-muted-foreground">
            Aguardam revisão manual
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Precisão IA</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.algorithmAccuracy || 0}%</div>
          <p className="text-xs text-muted-foreground">
            Baseado em {stats.totalFeedback || 0} feedbacks
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
