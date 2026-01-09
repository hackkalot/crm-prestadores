import { HeaderSkeleton, ProviderDetailSkeleton } from '@/components/skeletons/page-skeletons'

export default function ProviderDetailLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 p-6 overflow-auto">
        <ProviderDetailSkeleton />
      </div>
    </div>
  )
}
