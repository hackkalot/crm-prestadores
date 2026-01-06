import { Header } from '@/components/layout/header'

export default function PrestadoresLoading() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Prestadores"
        description="Gestao de prestadores ativos"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-card rounded-lg border">
              <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="h-12 bg-muted animate-pulse rounded-lg" />

        {/* Table skeleton */}
        <div className="bg-card rounded-lg border">
          <div className="h-12 border-b bg-muted/50" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b last:border-0 flex items-center px-4 gap-4">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="flex-1" />
              <div className="h-6 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
