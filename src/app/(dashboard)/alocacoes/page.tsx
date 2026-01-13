import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { AlocacoesStats } from '@/components/alocacoes/alocacoes-stats'
import { AlocacoesFilters } from '@/components/alocacoes/alocacoes-filters'
import { AlocacoesList } from '@/components/alocacoes/alocacoes-list'
import { SyncAllocationDialog } from '@/components/sync/sync-allocation-dialog'
import { getAllocationHistory, getAllocationStats, getAvailablePeriods } from '@/lib/allocations/actions'
import type { AllocationHistoryFilters } from '@/lib/allocations/actions'
import { Skeleton } from '@/components/ui/skeleton'

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

async function AlocacoesStatsSection() {
  const stats = await getAllocationStats()

  if ('error' in stats && stats.error) {
    return null
  }

  return <AlocacoesStats stats={stats as any} />
}

async function AlocacoesFiltersSection() {
  const availablePeriods = await getAvailablePeriods()
  return <AlocacoesFilters availablePeriods={availablePeriods} />
}

async function AlocacoesListSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 25
  const sortField = typeof params.sort === 'string' ? params.sort : 'requests_received'
  const sortDir = params.dir === 'asc' ? 'asc' : 'desc'

  // Build filters object from URL params
  const filters: AllocationHistoryFilters = {}

  if (typeof params.search === 'string' && params.search) {
    filters.search = params.search
  }
  if (typeof params.periodFrom === 'string' && params.periodFrom) {
    filters.periodFrom = params.periodFrom
  }
  if (typeof params.periodTo === 'string' && params.periodTo) {
    filters.periodTo = params.periodTo
  }
  if (params.acceptanceRate === 'low' || params.acceptanceRate === 'medium' || params.acceptanceRate === 'high') {
    filters.acceptanceRate = params.acceptanceRate
  }
  if (params.expirationRate === 'low' || params.expirationRate === 'medium' || params.expirationRate === 'high') {
    filters.expirationRate = params.expirationRate
  }
  if (params.volume === 'low' || params.volume === 'medium' || params.volume === 'high') {
    filters.volume = params.volume
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
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Histórico de Alocação"
        description="Métricas de alocação de pedidos por prestador"
        action={<SyncAllocationDialog />}
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <Suspense fallback={<StatsLoading />}>
          <AlocacoesStatsSection />
        </Suspense>

        <div className="space-y-4">
          <Suspense fallback={<FiltersLoading />}>
            <AlocacoesFiltersSection />
          </Suspense>

          <Suspense fallback={<TableLoading />}>
            <AlocacoesListSection searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
