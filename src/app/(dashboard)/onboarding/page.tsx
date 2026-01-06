import { Header } from '@/components/layout/header'
import { KanbanBoard } from '@/components/onboarding/kanban-board'
import { OnboardingFilters } from '@/components/onboarding/onboarding-filters'
import { OnboardingStats } from '@/components/onboarding/onboarding-stats'
import {
  getOnboardingKanban,
  getOnboardingStats,
  getUsers,
  type OnboardingFilters as OnboardingFiltersType,
} from '@/lib/onboarding/actions'
import { getAlertConfig } from '@/lib/settings/actions'
import type { OnboardingType } from '@/types/database'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  const filters: OnboardingFiltersType = {
    ownerId: params.ownerId as string | undefined,
    onboardingType: params.onboardingType as OnboardingType | undefined,
    search: params.search as string | undefined,
  }

  const [kanbanData, stats, users, alertConfig] = await Promise.all([
    getOnboardingKanban(filters),
    getOnboardingStats(),
    getUsers(),
    getAlertConfig(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Onboarding"
        description="Kanban de onboarding de prestadores"
      />
      <div className="flex-1 p-6 space-y-4 overflow-hidden flex flex-col">
        <OnboardingStats stats={stats} />
        <OnboardingFilters users={users} />
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            stages={kanbanData.stages}
            cards={kanbanData.cards}
            alertConfig={alertConfig}
          />
        </div>
      </div>
    </div>
  )
}
