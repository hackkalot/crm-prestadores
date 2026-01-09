import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { PrestadoresList } from '@/components/prestadores/prestadores-list'
import { PrestadoresFilters } from '@/components/prestadores/prestadores-filters'
import { PrestadoresStats } from '@/components/prestadores/prestadores-stats'
import { ImportProvidersDialog } from '@/components/import/import-providers-dialog'
import { CreateProviderDialog } from '@/components/providers/create-provider-dialog'
import {
  getPrestadores,
  getPrestadoresStats,
  getDistinctPrestadorDistricts,
  getDistinctPrestadorServices,
  getUsers,
  type PrestadorFilters,
} from '@/lib/prestadores/actions'
import type { Database } from '@/types/database'

type ProviderStatus = Database['public']['Enums']['provider_status']
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

// Async component for stats
async function StatsSection() {
  const stats = await getPrestadoresStats()
  return <PrestadoresStats stats={stats} />
}

// Async component for prestadores list
async function PrestadoresListSection({ filters }: { filters: PrestadorFilters }) {
  const prestadores = await getPrestadores(filters)
  return <PrestadoresList prestadores={prestadores} />
}

// Async component for filters (loads cached data)
async function FiltersSection() {
  const [districts, services, users] = await Promise.all([
    getDistinctPrestadorDistricts(),
    getDistinctPrestadorServices(),
    getUsers(),
  ])
  return <PrestadoresFilters districts={districts} services={services} users={users} />
}

// Async component for create dialog (loads cached data)
async function CreateProviderDialogAsync() {
  const [districts, services] = await Promise.all([
    getDistinctPrestadorDistricts(),
    getDistinctPrestadorServices(),
  ])
  return <CreateProviderDialog districts={districts} services={services} />
}

export default async function PrestadoresPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  const filters: PrestadorFilters = {
    status: (params.status as ProviderStatus | 'all' | '_all') || '_all',
    entityType: params.entityType as string | undefined,
    district: params.district as string | undefined,
    service: params.service as string | undefined,
    ownerId: params.ownerId as string | undefined,
    search: params.search as string | undefined,
  }

  // No awaits here - header appears instantly!
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Prestadores"
        description="Gestao de prestadores ativos na rede"
        action={
          <div className="flex gap-2">
            <Suspense fallback={null}>
              <CreateProviderDialogAsync />
            </Suspense>
            <ImportProvidersDialog />
          </div>
        }
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

        {/* Table loads independently */}
        <Suspense fallback={<div className="h-96" />}>
          <PrestadoresListSection filters={filters} />
        </Suspense>
      </div>
    </div>
  )
}
