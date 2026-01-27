import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { SubmissoesClientView } from '@/components/onboarding/submissoes-client-view'
import { StatsCardsSkeleton, CandidaturasListSkeleton } from '@/components/skeletons/page-skeletons'
import {
  getAllSubmissionsAggregated,
  getSubmissionsStats,
  getServiceDetailsForSubmissions,
  type SubmissoesFilters,
} from '@/lib/onboarding/submissoes-actions'
import { requirePageAccess } from '@/lib/permissions/guard'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Calendar, TrendingUp, Users } from 'lucide-react'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

// Stats cards component
function StatsCards({
  stats,
}: {
  stats: { total: number; thisWeek: number; thisMonth: number; byStatus: Record<string, number> }
}) {
  const emOnboarding = stats.byStatus['em_onboarding'] || 0
  const ativos = stats.byStatus['ativo'] || 0

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Submissões</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Esta Semana</p>
            <p className="text-2xl font-bold">{stats.thisWeek}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Este Mês</p>
            <p className="text-2xl font-bold">{stats.thisMonth}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <Users className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Em Onboarding / Ativos</p>
            <p className="text-2xl font-bold">
              {emOnboarding} / {ativos}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Async component for stats
async function StatsSection() {
  const stats = await getSubmissionsStats()
  return <StatsCards stats={stats} />
}

// Async component for submissions list
async function SubmissoesSection({ filters }: { filters: SubmissoesFilters }) {
  const data = await getAllSubmissionsAggregated(filters)

  // Collect all unique service IDs from all submissions
  const allServiceIds = new Set<string>()
  data.data.forEach((submission) => {
    submission.selected_services?.forEach((id) => allServiceIds.add(id))
  })

  // Fetch service details
  const servicesMap = await getServiceDetailsForSubmissions(Array.from(allServiceIds))

  return <SubmissoesClientView initialData={data} servicesMap={servicesMap} />
}

export default async function SubmissoesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requirePageAccess('onboarding')
  const params = await searchParams

  const filters: SubmissoesFilters = {
    search: params.search as string | undefined,
    providerStatus: (params.providerStatus as string) || 'all',
    dateFrom: params.dateFrom as string | undefined,
    dateTo: params.dateTo as string | undefined,
    page: params.page ? parseInt(params.page as string) : 1,
    limit: params.limit ? parseInt(params.limit as string) : 50,
    sortBy: params.sortBy as string | undefined,
    sortOrder: (params.sortOrder as 'asc' | 'desc') || 'desc',
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Submissões de Formulários"
        description="Histórico de todas as submissões de formulários de serviços"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Stats load independently */}
        <Suspense fallback={<StatsCardsSkeleton />}>
          <StatsSection />
        </Suspense>

        {/* Submissions list with client-side search */}
        <Suspense fallback={<CandidaturasListSkeleton rows={6} />}>
          <SubmissoesSection filters={filters} />
        </Suspense>
      </div>
    </div>
  )
}
