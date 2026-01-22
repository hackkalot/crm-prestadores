import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Construction } from 'lucide-react'
import { requirePageAccess } from '@/lib/permissions/guard'

export default async function ReportsPage() {
  await requirePageAccess('reports')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Reports"
        description="Relatorios e exportacoes de dados"
      />

      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <Construction className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold">Em Construção</h2>
              <p className="text-muted-foreground">
                Esta funcionalidade está em desenvolvimento.
                Em breve poderá gerar e exportar relatórios detalhados
                sobre a operação da rede de prestadores.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
