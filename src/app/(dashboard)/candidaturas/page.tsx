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
import type { ProviderStatus } from '@/types/database'

interface CandidaturasPageProps {
  searchParams: Promise<{
    status?: string
    entityType?: string
    district?: string
    service?: string
    dateFrom?: string
    dateTo?: string
    search?: string
  }>
}

export default async function CandidaturasPage({ searchParams }: CandidaturasPageProps) {
  const params = await searchParams

  const filters: CandidaturaFilters = {
    status: (params.status as ProviderStatus | 'all') || 'all',
    entityType: params.entityType,
    district: params.district,
    service: params.service,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    search: params.search,
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
        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Filters */}
        <Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded-lg" />}>
          <CandidaturasFilters districts={districts} services={services} />
        </Suspense>

        {/* List */}
        <CandidaturasList providers={providers} />
      </div>
    </div>
  )
}
