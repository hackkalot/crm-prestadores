import { HeaderSkeleton, KPIsPageSkeleton } from '@/components/skeletons/page-skeletons'

export default function KPIsLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 p-6 overflow-auto">
        <KPIsPageSkeleton />
      </div>
    </div>
  )
}
