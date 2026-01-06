import { Header } from '@/components/layout/header'

export default function AgendaLoading() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Agenda"
        description="As minhas tarefas"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-card rounded-lg border">
              <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>

        {/* Calendar/List skeleton */}
        <div className="bg-card rounded-lg border p-4">
          <div className="flex justify-between mb-4">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
