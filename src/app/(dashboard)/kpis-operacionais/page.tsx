import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Construction } from 'lucide-react'
import { requirePageAccess } from '@/lib/permissions/guard'

export default async function KpisOperacionaisPage() {
  await requirePageAccess('kpis_operacionais')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="KPI's Operacionais"
        description="Metricas operacionais da rede de prestadores"
      />

      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <Construction className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold">Em Construcao</h2>
              <p className="text-muted-foreground">
                Esta funcionalidade esta em desenvolvimento.
                Em breve podera visualizar KPIs operacionais detalhados
                sobre o desempenho da rede de prestadores.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
