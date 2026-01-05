import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { PrestadoresList } from '@/components/prestadores/prestadores-list'
import { PrestadoresFilters } from '@/components/prestadores/prestadores-filters'
import { PrestadoresStats } from '@/components/prestadores/prestadores-stats'
import {
  getPrestadores,
  getPrestadoresStats,
  getDistinctPrestadorDistricts,
  getDistinctPrestadorServices,
  type PrestadorFilters,
} from '@/lib/prestadores/actions'
import type { ProviderStatus } from '@/types/database'

interface PrestadoresPageProps {
  searchParams: Promise<{
    status?: string
    entityType?: string
    district?: string
    service?: string
    search?: string
  }>
}

export default async function PrestadoresPage({ searchParams }: PrestadoresPageProps) {
  const params = await searchParams

  const filters: PrestadorFilters = {
    status: (params.status as ProviderStatus | 'all') || 'all',
    entityType: params.entityType,
    district: params.district,
    service: params.service,
    search: params.search,
  }

  const [prestadores, stats, districts, services] = await Promise.all([
    getPrestadores(filters),
    getPrestadoresStats(),
    getDistinctPrestadorDistricts(),
    getDistinctPrestadorServices(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Prestadores"
        description="Gestao de prestadores ativos na rede"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Stats */}
        <PrestadoresStats stats={stats} />

        {/* Filters */}
        <Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded-lg" />}>
          <PrestadoresFilters districts={districts} services={services} />
        </Suspense>

        {/* List */}
        <PrestadoresList prestadores={prestadores} />
      </div>
    </div>
  )
}
