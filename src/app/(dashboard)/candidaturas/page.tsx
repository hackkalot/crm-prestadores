import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { CandidaturasList } from '@/components/candidaturas/candidaturas-list'
import { CandidaturasFilters } from '@/components/candidaturas/candidaturas-filters'
import { StatsCards } from '@/components/candidaturas/stats-cards'
import { ImportProvidersDialog } from '@/components/import/import-providers-dialog'
import { CreateProviderDialog } from '@/components/providers/create-provider-dialog'
import { StatsCardsSkeleton, FiltersSkeleton, CandidaturasListSkeleton } from '@/components/skeletons/page-skeletons'
import {
  getCandidaturas,
  getCandidaturasStats,
  getDistinctServices,
  getServicePricesForSelect,
  type CandidaturaFilters,
} from '@/lib/candidaturas/actions'
import { requirePageAccess } from '@/lib/permissions/guard'
import type { Database } from '@/types/database'

type ProviderStatus = Database['public']['Enums']['provider_status']
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

// Async component for stats
async function StatsSection() {
  const stats = await getCandidaturasStats()
  return <StatsCards stats={stats} />
}

// Async component for candidaturas list
async function CandidaturasListSection({ filters, viewMode }: { filters: CandidaturaFilters; viewMode: 'list' | 'grid' }) {
  const candidaturas = await getCandidaturas(filters)
  return <CandidaturasList candidaturas={candidaturas} viewMode={viewMode} />
}

// Async component for filters (loads cached data)
async function FiltersSection() {
  const services = await getDistinctServices()
  return <CandidaturasFilters services={services} />
}

// Async component for create dialog (loads service_prices for proper id/name selection)
// Coverage is handled internally by CoverageMultiSelect using PORTUGAL_DISTRICTS
async function CreateProviderDialogAsync() {
  const services = await getServicePricesForSelect()
  return <CreateProviderDialog services={services} />
}

export default async function CandidaturasPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requirePageAccess('candidaturas')
  const params = await searchParams

  const viewMode = (params.view as 'list' | 'grid') || 'list'

  // Parse multi-select filters from comma-separated URL params
  const parseMultiParam = (param: string | string[] | undefined): string[] | undefined => {
    if (!param) return undefined
    if (Array.isArray(param)) return param
    return param.split(',').filter(Boolean)
  }

  const filters: CandidaturaFilters = {
    status: (params.status as ProviderStatus | 'all') || 'all',
    entityType: params.entityType as string | undefined,
    counties: parseMultiParam(params.counties),
    services: parseMultiParam(params.services),
    dateFrom: params.dateFrom as string | undefined,
    dateTo: params.dateTo as string | undefined,
    search: params.search as string | undefined,
    page: params.page ? parseInt(params.page as string) : 1,
    limit: params.limit ? parseInt(params.limit as string) : 50,
    sortBy: params.sortBy as string | undefined,
    sortOrder: (params.sortOrder as 'asc' | 'desc') || undefined,
  }

  // No awaits here - header appears instantly!
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Candidaturas"
        description="Gestao de candidaturas de prestadores"
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
        <Suspense fallback={<StatsCardsSkeleton />}>
          <StatsSection />
        </Suspense>

        {/* Filters stream in with cached data (fast) */}
        <Suspense fallback={<FiltersSkeleton />}>
          <FiltersSection />
        </Suspense>

        {/* List loads independently */}
        <Suspense fallback={<CandidaturasListSkeleton rows={6} />}>
          <CandidaturasListSection filters={filters} viewMode={viewMode} />
        </Suspense>
      </div>
    </div>
  )
}
