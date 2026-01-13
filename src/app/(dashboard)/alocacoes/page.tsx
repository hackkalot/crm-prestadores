import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { AlocacoesStats } from '@/components/alocacoes/alocacoes-stats'
import { AlocacoesFilters } from '@/components/alocacoes/alocacoes-filters'
import { AlocacoesList } from '@/components/alocacoes/alocacoes-list'
import { SyncAllocationDialog } from '@/components/sync/sync-allocation-dialog'
import { getAllocationHistory, getAllocationStats } from '@/lib/allocations/actions'
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

async function AlocacoesStatsSection() {
  const stats = await getAllocationStats()

  if ('error' in stats && stats.error) {
    return null
  }

  return <AlocacoesStats stats={stats as any} />
}

async function AlocacoesListSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 25
  const search = typeof params.search === 'string' ? params.search : ''
  const sortField = typeof params.sort === 'string' ? params.sort : 'requests_received'
  const sortDir = params.dir === 'asc' ? 'asc' : 'desc'

  const { data, total, error } = await getAllocationHistory(
    { search },
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
          <AlocacoesFilters />

          <Suspense fallback={<TableLoading />}>
            <AlocacoesListSection searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
