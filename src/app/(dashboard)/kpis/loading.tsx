import { Header } from '@/components/layout/header'

export default function KpisLoading() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="KPIs"
        description="Metricas e indicadores de desempenho"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Main stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 bg-card rounded-lg border">
              <div className="h-4 w-32 bg-muted animate-pulse rounded mb-3" />
              <div className="h-10 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border p-4">
              <div className="h-5 w-40 bg-muted animate-pulse rounded mb-4" />
              <div className="h-48 bg-muted/50 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
