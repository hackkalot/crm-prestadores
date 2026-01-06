import { Header } from '@/components/layout/header'

export default function OnboardingLoading() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Onboarding"
        description="Kanban de onboarding de prestadores"
      />
      <div className="flex-1 p-6 space-y-4 overflow-hidden flex flex-col">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 bg-card rounded-lg border">
              <div className="h-3 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-6 w-10 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="h-10 bg-muted animate-pulse rounded" />

        {/* Kanban skeleton */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-72 flex-shrink-0 bg-muted/30 rounded-lg p-3">
              <div className="h-5 w-24 bg-muted animate-pulse rounded mb-3" />
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-24 bg-card rounded border animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
