import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { KanbanBoard } from '@/components/onboarding/kanban-board'
import { OnboardingFilters } from '@/components/onboarding/onboarding-filters'
import { OnboardingStats } from '@/components/onboarding/onboarding-stats'
import { StatsCards4Skeleton, FiltersSkeleton, KanbanBoardSkeleton } from '@/components/skeletons/page-skeletons'
import {
  getOnboardingKanban,
  getOnboardingStats,
  getUsers,
  type OnboardingFilters as OnboardingFiltersType,
  type OnboardingType,
} from '@/lib/onboarding/actions'
import { getAlertConfig } from '@/lib/settings/actions'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

// Async component for stats
async function StatsSection() {
  const stats = await getOnboardingStats()
  return <OnboardingStats stats={stats} />
}

// Async component for filters (loads cached data)
async function FiltersSection() {
  const users = await getUsers()
  return <OnboardingFilters users={users} />
}

// Async component for kanban board
async function KanbanSection({ filters }: { filters: OnboardingFiltersType }) {
  const [kanbanData, alertConfig] = await Promise.all([
    getOnboardingKanban(filters),
    getAlertConfig(),
  ])
  return (
    <div className="flex-1 overflow-hidden">
      <KanbanBoard
        stages={kanbanData.stages}
        cards={kanbanData.cards}
        alertConfig={alertConfig}
      />
    </div>
  )
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  // Parse multi-select filter from comma-separated URL param
  const countiesParam = params.counties as string | undefined
  const counties = countiesParam ? countiesParam.split(',').filter(Boolean) : undefined

  const filters: OnboardingFiltersType = {
    ownerId: params.ownerId as string | undefined,
    onboardingType: params.onboardingType as OnboardingType | undefined,
    entityType: params.entityType as string | undefined,
    counties,
    search: params.search as string | undefined,
  }

  // No awaits here - header appears instantly!
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Onboarding"
        description="Kanban de onboarding de prestadores"
      />
      <div className="flex-1 p-6 space-y-4 overflow-hidden flex flex-col">
        {/* Stats load independently */}
        <Suspense fallback={<StatsCards4Skeleton />}>
          <StatsSection />
        </Suspense>

        {/* Filters stream in with cached data (fast) */}
        <Suspense fallback={<FiltersSkeleton />}>
          <FiltersSection />
        </Suspense>

        {/* Kanban board loads independently */}
        <Suspense fallback={<div className="flex-1 overflow-hidden"><KanbanBoardSkeleton /></div>}>
          <KanbanSection filters={filters} />
        </Suspense>
      </div>
    </div>
  )
}
