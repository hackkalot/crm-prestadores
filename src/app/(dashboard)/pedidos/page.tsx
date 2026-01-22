import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { PedidosList } from '@/components/pedidos/pedidos-list'
import { PedidosFilters } from '@/components/pedidos/pedidos-filters'
import { PedidosStats } from '@/components/pedidos/pedidos-stats'
import { PedidosMap } from '@/components/pedidos/pedidos-map'
import { SyncBackofficeDialog } from '@/components/sync/sync-backoffice-dialog'
import { LastSyncBadge } from '@/components/sync/last-sync-badge'
import { StatsCardsSkeleton, FiltersSkeleton, PrestadoresTableSkeleton } from '@/components/skeletons/page-skeletons'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getServiceRequests,
  getServiceRequestsForMap,
  getServiceRequestStats,
  getDistinctCategories,
  getDistinctDistricts,
  getDistinctProviders,
  getDistinctStatuses,
  type ServiceRequestFilters,
} from '@/lib/service-requests/actions'
import { getLastSuccessfulSync } from '@/lib/sync/logs-actions'
import { requirePageAccess } from '@/lib/permissions/guard'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

// Async component for stats
async function StatsSection() {
  const stats = await getServiceRequestStats()
  return <PedidosStats stats={stats} />
}

// Async component for pedidos list
async function PedidosListSection({ filters }: { filters: ServiceRequestFilters }) {
  const result = await getServiceRequests(filters)
  return <PedidosList paginatedResult={result} />
}

// Async component for pedidos map
async function PedidosMapSection({ filters }: { filters: ServiceRequestFilters }) {
  const pedidos = await getServiceRequestsForMap(filters)
  return <PedidosMap pedidos={pedidos} />
}

// Skeleton for map loading
function MapSkeleton() {
  return (
    <Skeleton className="w-full flex-1 min-h-[400px] rounded-lg" />
  )
}

// Async component for filters
async function FiltersSection() {
  const [categories, districts, providers, statuses] = await Promise.all([
    getDistinctCategories(),
    getDistinctDistricts(),
    getDistinctProviders(),
    getDistinctStatuses(),
  ])
  return (
    <PedidosFilters
      categories={categories}
      districts={districts}
      providers={providers}
      statuses={statuses}
    />
  )
}

// Async component for sync info
async function SyncInfoSection() {
  const syncInfo = await getLastSuccessfulSync('service_requests')
  return <LastSyncBadge syncInfo={syncInfo} label="Sync" />
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requirePageAccess('pedidos')
  const params = await searchParams

  const view = (params.view as string) || 'table'

  const filters: ServiceRequestFilters = {
    status: params.status as string | undefined,
    category: params.category as string | undefined,
    district: params.district as string | undefined,
    provider: params.provider as string | undefined,
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
        title="Pedidos de Servico"
        description="Gestao de pedidos de servico importados do backoffice FIXO"
        action={<SyncBackofficeDialog />}
        syncInfo={
          <Suspense fallback={null}>
            <SyncInfoSection />
          </Suspense>
        }
      />
      <div className={`flex-1 p-6 ${view === 'map' ? 'flex flex-col gap-6 overflow-hidden' : 'space-y-6 overflow-auto'}`}>
        {/* Stats */}
        <Suspense fallback={<StatsCardsSkeleton />}>
          <StatsSection />
        </Suspense>

        {/* Filters */}
        <Suspense fallback={<FiltersSkeleton />}>
          <FiltersSection />
        </Suspense>

        {/* Table or Map */}
        {view === 'map' ? (
          <div className="flex-1 flex flex-col min-h-0">
            <Suspense fallback={<MapSkeleton />}>
              <PedidosMapSection filters={filters} />
            </Suspense>
          </div>
        ) : (
          <Suspense fallback={<PrestadoresTableSkeleton />}>
            <PedidosListSection filters={filters} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
