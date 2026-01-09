import { HeaderSkeleton, PrioridadesSkeleton } from '@/components/skeletons/page-skeletons'

export default function PrioridadesLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 p-6 overflow-auto">
        <PrioridadesSkeleton />
      </div>
    </div>
  )
}
