import { HeaderSkeleton, RedeSkeleton } from '@/components/skeletons/page-skeletons'

export default function RedeLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 p-6 overflow-auto">
        <RedeSkeleton />
      </div>
    </div>
  )
}
