import { Header } from '@/components/layout/header'
import { CandidaturasList } from '@/components/candidaturas/candidaturas-list'
import { CandidaturasFilters } from '@/components/candidaturas/candidaturas-filters'
import { StatsCards } from '@/components/candidaturas/stats-cards'
import {
  getCandidaturas,
  getCandidaturasStats,
  getDistinctDistricts,
  getDistinctServices,
  type CandidaturaFilters,
} from '@/lib/candidaturas/actions'
import type { Database } from '@/types/database'

type ProviderStatus = Database['public']['Enums']['provider_status']
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function CandidaturasPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  const filters: CandidaturaFilters = {
    status: (params.status as ProviderStatus | 'all') || 'all',
    entityType: params.entityType as string | undefined,
    district: params.district as string | undefined,
    service: params.service as string | undefined,
    dateFrom: params.dateFrom as string | undefined,
    dateTo: params.dateTo as string | undefined,
    search: params.search as string | undefined,
  }

  const [providers, stats, districts, services] = await Promise.all([
    getCandidaturas(filters),
    getCandidaturasStats(),
    getDistinctDistricts(),
    getDistinctServices(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Candidaturas"
        description="Gestao de candidaturas de prestadores"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <StatsCards stats={stats} />
        <CandidaturasFilters districts={districts} services={services} />
        <CandidaturasList providers={providers} />
      </div>
    </div>
  )
}
