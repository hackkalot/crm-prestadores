import { HeaderSkeleton, ConfiguracoesSkeleton } from '@/components/skeletons/page-skeletons'

export default function ConfiguracoesLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 p-6 overflow-auto">
        <ConfiguracoesSkeleton />
      </div>
    </div>
  )
}
