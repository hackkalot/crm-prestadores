import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { FaturacaoList } from '@/components/faturacao/faturacao-list'
import { FaturacaoFilters } from '@/components/faturacao/faturacao-filters'
import { FaturacaoStats } from '@/components/faturacao/faturacao-stats'
import { SyncBillingDialog } from '@/components/sync/sync-billing-dialog'
import {
  StatsCardsSkeleton,
  FiltersSkeleton,
  PrestadoresTableSkeleton,
} from '@/components/skeletons/page-skeletons'
import {
  getBillingProcesses,
  getBillingStats,
  getDistinctBillingProviders,
  getDistinctBillingServices,
  getDistinctBillingStatuses,
  getAvailableBillingPeriods,
  type BillingFilters,
} from '@/lib/billing/actions'
import { requirePageAccess } from '@/lib/permissions/guard'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

// Async component for stats
async function StatsSection() {
  const stats = await getBillingStats()
  return <FaturacaoStats stats={stats} />
}

// Async component for billing list
async function BillingListSection({ filters }: { filters: BillingFilters }) {
  const result = await getBillingProcesses(filters)
  return <FaturacaoList paginatedResult={result} />
}

// Async component for filters
async function FiltersSection() {
  const [providers, services, statuses, availablePeriods] = await Promise.all([
    getDistinctBillingProviders(),
    getDistinctBillingServices(),
    getDistinctBillingStatuses(),
    getAvailableBillingPeriods(),
  ])
  return (
    <FaturacaoFilters
      providers={providers}
      services={services}
      statuses={statuses}
      availablePeriods={availablePeriods}
    />
  )
}

export default async function FaturacaoPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requirePageAccess('faturacao')
  const params = await searchParams

  const filters: BillingFilters = {
    status: params.status as string | undefined,
    provider: params.provider as string | undefined,
    service: params.service as string | undefined,
    search: params.search as string | undefined,
    dateFrom: params.dateFrom as string | undefined,
    dateTo: params.dateTo as string | undefined,
    page: params.page ? parseInt(params.page as string) : 1,
    limit: params.limit ? parseInt(params.limit as string) : 100,
    sortBy: params.sortBy as string | undefined,
    sortOrder: (params.sortOrder as 'asc' | 'desc') || 'desc',
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Faturação"
        description="Gestão de processos de faturação dos prestadores"
        action={<SyncBillingDialog />}
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Stats */}
        <Suspense fallback={<StatsCardsSkeleton />}>
          <StatsSection />
        </Suspense>

        {/* Filters */}
        <Suspense fallback={<FiltersSkeleton />}>
          <FiltersSection />
        </Suspense>

        {/* Table */}
        <Suspense fallback={<PrestadoresTableSkeleton />}>
          <BillingListSection filters={filters} />
        </Suspense>
      </div>
    </div>
  )
}
