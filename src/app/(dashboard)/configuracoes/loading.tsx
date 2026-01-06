import { Header } from '@/components/layout/header'

export default function ConfiguracoesLoading() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Configuracoes"
        description="Configuracoes do sistema"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Tabs skeleton */}
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-muted animate-pulse rounded" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="space-y-1">
                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                <div className="h-3 w-56 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
