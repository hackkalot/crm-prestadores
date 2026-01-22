import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { AlocacoesStats } from '@/components/alocacoes/alocacoes-stats'
import { AlocacoesFilters } from '@/components/alocacoes/alocacoes-filters'
import { AlocacoesList } from '@/components/alocacoes/alocacoes-list'
import { SyncAllocationDialog } from '@/components/sync/sync-allocation-dialog'
import { LastSyncBadge } from '@/components/sync/last-sync-badge'
import { getAllocationHistory, getAllocationStats, getAvailablePeriods } from '@/lib/allocations/actions'
import type { AllocationHistoryFilters, AllocationStatsFilters } from '@/lib/allocations/actions'
import { getLastSuccessfulSync } from '@/lib/sync/logs-actions'
import { Skeleton } from '@/components/ui/skeleton'
import { requirePageAccess } from '@/lib/permissions/guard'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

function TableLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      {[...Array(10)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

function FiltersLoading() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className="h-10 w-[200px]" />
      <Skeleton className="h-10 w-[180px]" />
      <Skeleton className="h-10 w-[160px]" />
      <Skeleton className="h-10 w-[160px]" />
      <Skeleton className="h-10 w-[150px]" />
    </div>
  )
}

async function AlocacoesStatsSection({ filters }: { filters: AllocationStatsFilters }) {
  const stats = await getAllocationStats(filters)

  if ('error' in stats && stats.error) {
    return null
  }

  return <AlocacoesStats stats={stats as any} />
}

async function AlocacoesFiltersSection() {
  const availablePeriods = await getAvailablePeriods()
  return <AlocacoesFilters availablePeriods={availablePeriods} />
}

// Async component for sync info
async function SyncInfoSection() {
  const syncInfo = await getLastSuccessfulSync('allocations')
  return <LastSyncBadge syncInfo={syncInfo} label="Sync" />
}

async function AlocacoesListSection({
  periodFrom,
  periodTo,
  search,
  acceptanceRate,
  expirationRate,
  volume,
  sort,
  dir,
  page: pageStr,
  limit: limitStr,
}: {
  periodFrom?: string
  periodTo?: string
  search?: string
  acceptanceRate?: string
  expirationRate?: string
  volume?: string
  sort?: string
  dir?: string
  page?: string
  limit?: string
}) {
  const page = Number(pageStr) || 1
  const limit = Number(limitStr) || 25
  const sortField = sort || 'requests_received'
  const sortDir = dir === 'asc' ? 'asc' : 'desc'

  // Build filters object
  const filters: AllocationHistoryFilters = {}

  if (search) {
    filters.search = search
  }
  if (periodFrom) {
    filters.periodFrom = periodFrom
  }
  if (periodTo) {
    filters.periodTo = periodTo
  }
  if (acceptanceRate === 'low' || acceptanceRate === 'medium' || acceptanceRate === 'high') {
    filters.acceptanceRate = acceptanceRate
  }
  if (expirationRate === 'low' || expirationRate === 'medium' || expirationRate === 'high') {
    filters.expirationRate = expirationRate
  }
  if (volume === 'low' || volume === 'medium' || volume === 'high') {
    filters.volume = volume
  }

  const { data, total, error } = await getAllocationHistory(
    filters,
    { field: sortField, direction: sortDir },
    { page, limit }
  )

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Erro ao carregar dados: {error}
      </div>
    )
  }

  return (
    <AlocacoesList
      data={data}
      total={total}
      page={page}
      limit={limit}
    />
  )
}

export default async function AlocacoesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requirePageAccess('alocacoes')
  const params = await searchParams

  // Extract all filter params
  const periodFrom = typeof params.periodFrom === 'string' ? params.periodFrom : undefined
  const periodTo = typeof params.periodTo === 'string' ? params.periodTo : undefined
  const search = typeof params.search === 'string' ? params.search : undefined
  const acceptanceRate = typeof params.acceptanceRate === 'string' ? params.acceptanceRate : undefined
  const expirationRate = typeof params.expirationRate === 'string' ? params.expirationRate : undefined
  const volume = typeof params.volume === 'string' ? params.volume : undefined
  const sort = typeof params.sort === 'string' ? params.sort : undefined
  const dir = typeof params.dir === 'string' ? params.dir : undefined
  const page = typeof params.page === 'string' ? params.page : undefined
  const limit = typeof params.limit === 'string' ? params.limit : undefined

  // Stats filters (just period)
  const statsFilters: AllocationStatsFilters = {}
  if (periodFrom) statsFilters.periodFrom = periodFrom
  if (periodTo) statsFilters.periodTo = periodTo

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Histórico de Alocação"
        description="Métricas de alocação de pedidos por prestador"
        action={<SyncAllocationDialog />}
        syncInfo={
          <Suspense fallback={null}>
            <SyncInfoSection />
          </Suspense>
        }
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <Suspense fallback={<StatsLoading />}>
          <AlocacoesStatsSection filters={statsFilters} />
        </Suspense>

        <div className="space-y-4">
          <Suspense fallback={<FiltersLoading />}>
            <AlocacoesFiltersSection />
          </Suspense>

          <Suspense fallback={<TableLoading />}>
            <AlocacoesListSection
              periodFrom={periodFrom}
              periodTo={periodTo}
              search={search}
              acceptanceRate={acceptanceRate}
              expirationRate={expirationRate}
              volume={volume}
              sort={sort}
              dir={dir}
              page={page}
              limit={limit}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
