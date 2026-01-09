import { HeaderSkeleton, StatsCards4Skeleton, FiltersSkeleton, KanbanBoardSkeleton } from '@/components/skeletons/page-skeletons'

export default function OnboardingLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 p-6 space-y-4 overflow-hidden flex flex-col">
        <StatsCards4Skeleton />
        <FiltersSkeleton />
        <div className="flex-1 overflow-hidden">
          <KanbanBoardSkeleton />
        </div>
      </div>
    </div>
  )
}
