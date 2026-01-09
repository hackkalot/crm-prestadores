import { HeaderSkeleton, AgendaSkeleton } from '@/components/skeletons/page-skeletons'

export default function AgendaLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 p-6 overflow-auto">
        <AgendaSkeleton />
      </div>
    </div>
  )
}
