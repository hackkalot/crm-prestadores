import { Header } from '@/components/layout/header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ServiceMappingReview } from '@/components/service-mapping/service-mapping-review'
import { ServiceMappingStats } from '@/components/service-mapping/service-mapping-stats'
import { getPendingSuggestions, getMappingStats } from '@/lib/service-mapping/actions'
import { Settings, ListTodo, History, Network } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Mapeamento de Serviços',
  description: 'Revê e aprova mapeamentos de serviços com IA',
}

export default async function ServiceMappingPage() {
  const [suggestionsResult, statsResult] = await Promise.all([
    getPendingSuggestions(),
    getMappingStats(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Configurações"
        description="Definições globais de onboarding, prazos e alertas"
      />
      <div className="flex-1 p-6 overflow-auto">
        <Tabs value="mapping" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks" className="gap-2" asChild>
              <Link href="/configuracoes">
                <ListTodo className="h-4 w-4" />
                Tarefas
              </Link>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" asChild>
              <Link href="/configuracoes">
                <Settings className="h-4 w-4" />
                Alertas
              </Link>
            </TabsTrigger>
            <TabsTrigger value="mapping" className="gap-2">
              <Network className="h-4 w-4" />
              Mapeamento
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2" asChild>
              <Link href="/configuracoes">
                <History className="h-4 w-4" />
                Histórico
              </Link>
            </TabsTrigger>
          </TabsList>

          <div className="space-y-6">
            <ServiceMappingStats stats={statsResult} />
            <ServiceMappingReview suggestions={suggestionsResult.data} />
          </div>
        </Tabs>
      </div>
    </div>
  )
}
