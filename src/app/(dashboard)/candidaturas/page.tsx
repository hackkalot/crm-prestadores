import { Suspense } from 'react'
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

// Async component for stats
async function StatsSection() {
  const stats = await getCandidaturasStats()
  return <StatsCards stats={stats} />
}

// Async component for candidaturas list
async function CandidaturasListSection({ filters }: { filters: CandidaturaFilters }) {
  const providers = await getCandidaturas(filters)
  return <CandidaturasList providers={providers} />
}

// Async component for filters (loads cached data)
async function FiltersSection() {
  const [districts, services] = await Promise.all([
    getDistinctDistricts(),
    getDistinctServices(),
  ])
  return <CandidaturasFilters districts={districts} services={services} />
}

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

  // No awaits here - header appears instantly!
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Candidaturas"
        description="Gestao de candidaturas de prestadores"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Stats load independently */}
        <Suspense fallback={<div className="h-24" />}>
          <StatsSection />
        </Suspense>

        {/* Filters stream in with cached data (fast) */}
        <Suspense fallback={<div className="h-12" />}>
          <FiltersSection />
        </Suspense>

        {/* List loads independently */}
        <Suspense fallback={<div className="h-96" />}>
          <CandidaturasListSection filters={filters} />
        </Suspense>
      </div>
    </div>
  )
}
