'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { List, Map } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ViewToggleProps {
  className?: string
}

export function ViewToggle({ className }: ViewToggleProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentView = searchParams.get('view') || 'table'

  const setView = (view: 'table' | 'map') => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (view === 'table') {
        params.delete('view')
      } else {
        params.set('view', view)
      }
      router.push(`/pedidos?${params.toString()}`)
    })
  }

  return (
    <div className={cn('flex items-center border rounded-lg p-0.5 bg-muted/50', className)}>
      <Button
        variant={currentView === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setView('table')}
        disabled={isPending}
        className="h-7 px-2.5 gap-1.5"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">Lista</span>
      </Button>
      <Button
        variant={currentView === 'map' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setView('map')}
        disabled={isPending}
        className="h-7 px-2.5 gap-1.5"
      >
        <Map className="h-4 w-4" />
        <span className="hidden sm:inline">Mapa</span>
      </Button>
    </div>
  )
}
