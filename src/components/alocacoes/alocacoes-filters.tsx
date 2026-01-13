'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

export function AlocacoesFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const search = searchParams.get('search') || ''

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    // Reset to page 1 when filters change
    params.set('page', '1')

    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  const debouncedSearch = useDebounce((value: string) => {
    updateParams({ search: value || null })
  }, 300)

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar prestador..."
          className="pl-9"
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
        />
      </div>
    </div>
  )
}
