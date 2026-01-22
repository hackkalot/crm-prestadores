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
  getPrestadoresStats,
  getDistinctPrestadorServices,
  getUsers,
} from '@/lib/prestadores/actions'
import { requirePageAccess } from '@/lib/permissions/guard'

// Async component for stats
async function StatsSection() {
  const stats = await getPrestadoresStats()
  return <PrestadoresStats stats={stats} />
}

// Async component that loads only lightweight data (services, users for filters)
// Main data is loaded client-side via SWR for instant page load
async function PrestadoresSection() {
  const [services, users] = await Promise.all([
    getDistinctPrestadorServices(),
    getUsers(),
  ])

  return (
    <PrestadoresClientView
      services={services}
      users={users}
    />
  )
}

export default async function PrestadoresPage() {
  await requirePageAccess('prestadores')

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

        {/* Prestadores - data loaded client-side via SWR */}
        <Suspense fallback={<PrestadoresTableSkeleton />}>
          <PrestadoresSection />
        </Suspense>
      </div>
    </div>
  )
}
