import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { StatsCards } from '@/components/candidaturas/stats-cards'
import { CandidaturasClientView } from '@/components/candidaturas/candidaturas-client-view'
import { ImportProvidersDialog } from '@/components/import/import-providers-dialog'
import { CreateProviderDialog } from '@/components/providers/create-provider-dialog'
import { StatsCardsSkeleton, CandidaturasListSkeleton } from '@/components/skeletons/page-skeletons'
import {
  getAllCandidaturasForClientSearch,
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

// Async component for candidaturas with client-side fuzzy search
async function CandidaturasSection({ filters }: { filters: CandidaturaFilters }) {
  // Load all data for client-side filtering (text search done on client)
  const [data, services] = await Promise.all([
    getAllCandidaturasForClientSearch(filters),
    getDistinctServices(),
  ])
  return <CandidaturasClientView initialData={data} services={services} />
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
    technicians: params.technicians as string | undefined,
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

        {/* Candidaturas with client-side fuzzy search */}
        <Suspense fallback={<CandidaturasListSkeleton rows={6} />}>
          <CandidaturasSection filters={filters} />
        </Suspense>
      </div>
    </div>
  )
}
