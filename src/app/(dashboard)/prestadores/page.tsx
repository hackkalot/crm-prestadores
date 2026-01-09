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

  const [prestadores, stats, districts, services, users] = await Promise.all([
    getPrestadores(filters),
    getPrestadoresStats(),
    getDistinctPrestadorDistricts(),
    getDistinctPrestadorServices(),
    getUsers(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Prestadores"
        description="Gestao de prestadores ativos na rede"
        action={
          <div className="flex gap-2">
            <CreateProviderDialog districts={districts} services={services} />
            <ImportProvidersDialog />
          </div>
        }
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <PrestadoresStats stats={stats} />
        <PrestadoresFilters districts={districts} services={services} users={users} />
        <PrestadoresList prestadores={prestadores} />
      </div>
    </div>
  )
}
