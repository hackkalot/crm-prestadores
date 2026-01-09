import { HeaderSkeleton, StatsCardsSkeleton, FiltersSkeleton, TableSkeleton } from '@/components/skeletons/page-skeletons'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <StatsCardsSkeleton />
        <FiltersSkeleton />
        <TableSkeleton rows={8} />
      </div>
    </div>
  )
}
