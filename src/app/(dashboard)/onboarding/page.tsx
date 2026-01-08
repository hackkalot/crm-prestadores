import { Header } from '@/components/layout/header'
import { KanbanBoard } from '@/components/onboarding/kanban-board'
import { OnboardingFilters } from '@/components/onboarding/onboarding-filters'
import { OnboardingStats } from '@/components/onboarding/onboarding-stats'
import {
  getOnboardingKanban,
  getOnboardingStats,
  getUsers,
  type OnboardingFilters as OnboardingFiltersType,
  type OnboardingType,
} from '@/lib/onboarding/actions'
import { getDistinctDistricts } from '@/lib/candidaturas/actions'
import { getAlertConfig } from '@/lib/settings/actions'

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
    entityType: params.entityType as string | undefined,
    district: params.district as string | undefined,
    search: params.search as string | undefined,
  }

  const [kanbanData, stats, users, alertConfig, districts] = await Promise.all([
    getOnboardingKanban(filters),
    getOnboardingStats(),
    getUsers(),
    getAlertConfig(),
    getDistinctDistricts(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Onboarding"
        description="Kanban de onboarding de prestadores"
      />
      <div className="flex-1 p-6 space-y-4 overflow-hidden flex flex-col">
        <OnboardingStats stats={stats} />
        <OnboardingFilters users={users} districts={districts} />
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
