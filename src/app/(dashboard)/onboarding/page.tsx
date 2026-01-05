import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { KanbanBoard } from '@/components/onboarding/kanban-board'
import { OnboardingFilters } from '@/components/onboarding/onboarding-filters'
import { OnboardingStats } from '@/components/onboarding/onboarding-stats'
import { getOnboardingKanban, getOnboardingStats, getUsers } from '@/lib/onboarding/actions'
import { getAlertConfig } from '@/lib/settings/actions'
import type { OnboardingType } from '@/types/database'

interface OnboardingPageProps {
  searchParams: Promise<{
    ownerId?: string
    onboardingType?: string
    search?: string
  }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams

  const filters = {
    ownerId: params.ownerId,
    onboardingType: params.onboardingType as OnboardingType | undefined,
    search: params.search,
  }

  const [{ stages, cards }, stats, users, alertConfig] = await Promise.all([
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
        {/* Stats */}
        <OnboardingStats stats={stats} />

        {/* Filters */}
        <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded" />}>
          <OnboardingFilters users={users} />
        </Suspense>

        {/* Kanban Board */}
        <div className="flex-1 overflow-hidden">
          <KanbanBoard stages={stages} cards={cards} alertConfig={alertConfig} />
        </div>
      </div>
    </div>
  )
}
