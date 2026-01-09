import { HeaderSkeleton, StatsCardsSkeleton, FiltersSkeleton, CandidaturasListSkeleton } from '@/components/skeletons/page-skeletons'

export default function CandidaturasLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <StatsCardsSkeleton />
        <FiltersSkeleton />
        <CandidaturasListSkeleton rows={6} />
      </div>
    </div>
  )
}
