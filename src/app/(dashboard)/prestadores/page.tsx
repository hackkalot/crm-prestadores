import { Suspense } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { PrestadoresList } from '@/components/prestadores/prestadores-list'
import { PrestadoresFilters } from '@/components/prestadores/prestadores-filters'
import { PrestadoresStats } from '@/components/prestadores/prestadores-stats'
import { SyncProvidersDialog } from '@/components/sync/sync-providers-dialog'
import { StatsCardsSkeleton, FiltersSkeleton, PrestadoresTableSkeleton } from '@/components/skeletons/page-skeletons'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import {
  getPrestadores,
  getPrestadoresStats,
  getDistinctPrestadorServices,
  getUsers,
  getProviderServiceRequestCounts,
  type PrestadorFilters,
} from '@/lib/prestadores/actions'
import { requirePageAccess } from '@/lib/permissions/guard'
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

  // Get service request counts for providers that have backoffice_provider_id
  const backofficeIds = prestadores.data
    .filter((p) => p.backoffice_provider_id !== null)
    .map((p) => p.backoffice_provider_id as number)

  const requestCounts = await getProviderServiceRequestCounts(backofficeIds)

  return <PrestadoresList prestadores={prestadores} requestCounts={requestCounts} />
}

// Async component for filters (loads cached data)
async function FiltersSection() {
  const [services, users] = await Promise.all([
    getDistinctPrestadorServices(),
    getUsers(),
  ])
  return <PrestadoresFilters services={services} users={users} />
}


export default async function PrestadoresPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requirePageAccess('prestadores')
  const params = await searchParams

  // Parse multi-select filters from comma-separated URL params
  const parseMultiParam = (param: string | string[] | undefined): string[] | undefined => {
    if (!param) return undefined
    if (Array.isArray(param)) return param
    return param.split(',').filter(Boolean)
  }

  const filters: PrestadorFilters = {
    status: (params.status as ProviderStatus | 'all' | '_all') || '_all',
    entityType: params.entityType as string | undefined,
    counties: parseMultiParam(params.counties),
    services: parseMultiParam(params.services),
    ownerId: params.ownerId as string | undefined,
    search: params.search as string | undefined,
    hasPedidos: (params.hasPedidos as 'all' | 'with' | 'without') || undefined,
    page: params.page ? parseInt(params.page as string) : 1,
    limit: params.limit ? parseInt(params.limit as string) : 50,
    sortBy: params.sortBy as string | undefined,
    sortOrder: (params.sortOrder as 'asc' | 'desc') || undefined,
  }

  // No awaits here - header appears instantly!
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Prestadores"
        description="Gestão de prestadores ativos na rede"
        action={
          <div className="flex gap-2">
            <Link href="/prestadores/duplicados">
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Duplicados
              </Button>
            </Link>
            <SyncProvidersDialog />
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

        {/* Table loads independently */}
        <Suspense fallback={<PrestadoresTableSkeleton />}>
          <PrestadoresListSection filters={filters} />
        </Suspense>
      </div>
    </div>
  )
}
