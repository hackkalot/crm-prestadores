import { Header } from '@/components/layout/header'
import { ServiceMappingReview } from '@/components/service-mapping/service-mapping-review'
import { ServiceMappingStats } from '@/components/service-mapping/service-mapping-stats'
import { getPendingSuggestions, getMappingStats } from '@/lib/service-mapping/actions'

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
        title="Mapeamento de Serviços"
        description="Sistema inteligente de mapeamento entre serviços dos prestadores e taxonomia unificada"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <ServiceMappingStats stats={statsResult} />
        <ServiceMappingReview suggestions={suggestionsResult.data} />
      </div>
    </div>
  )
}
