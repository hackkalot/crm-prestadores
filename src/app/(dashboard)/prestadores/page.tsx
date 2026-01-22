import { Suspense } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { PrestadoresStats } from '@/components/prestadores/prestadores-stats'
import { PrestadoresClientView } from '@/components/prestadores/prestadores-client-view'
import { SyncProvidersDialog } from '@/components/sync/sync-providers-dialog'
import { StatsCardsSkeleton, PrestadoresTableSkeleton } from '@/components/skeletons/page-skeletons'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import {
  getAllPrestadoresForClientSearch,
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

// Async component for prestadores with client-side fuzzy search
async function PrestadoresSection({ filters }: { filters: PrestadorFilters }) {
  // Load all data for client-side filtering (text search done on client)
  const [data, services, users] = await Promise.all([
    getAllPrestadoresForClientSearch(filters),
    getDistinctPrestadorServices(),
    getUsers(),
  ])

  // Get service request counts for providers that have backoffice_provider_id
  const backofficeIds = data.data
    .filter((p) => p.backoffice_provider_id !== null)
    .map((p) => p.backoffice_provider_id as number)

  const requestCounts = await getProviderServiceRequestCounts(backofficeIds)

  return (
    <PrestadoresClientView
      initialData={data}
      services={services}
      users={users}
      requestCounts={requestCounts}
    />
  )
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
    hasPedidos: (params.hasPedidos as 'all' | 'with' | 'without') || undefined,
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

        {/* Prestadores with client-side fuzzy search */}
        <Suspense fallback={<PrestadoresTableSkeleton />}>
          <PrestadoresSection filters={filters} />
        </Suspense>
      </div>
    </div>
  )
}
