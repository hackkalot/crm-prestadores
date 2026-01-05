'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'

interface OnboardingFiltersProps {
  users: Array<{ id: string; name: string | null; email?: string }>
}

export function OnboardingFilters({ users }: OnboardingFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString())

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') {
          newParams.delete(key)
        } else {
          newParams.set(key, value)
        }
      })

      return newParams.toString()
    },
    [searchParams]
  )

  const handleFilterChange = (key: string, value: string | null) => {
    const queryString = createQueryString({ [key]: value })
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`)
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const search = formData.get('search') as string
    handleFilterChange('search', search || null)
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  const hasFilters =
    searchParams.has('search') ||
    searchParams.has('ownerId') ||
    searchParams.has('onboardingType')

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Pesquisar prestador..."
            defaultValue={searchParams.get('search') || ''}
            className="pl-9 w-[200px]"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Pesquisar
        </Button>
      </form>

      {/* Owner Filter */}
      <Select
        value={searchParams.get('ownerId') || 'all'}
        onValueChange={(value) => handleFilterChange('ownerId', value)}
      >
        <SelectTrigger className="w-40">
          <span className="truncate">
            {(() => {
              const ownerId = searchParams.get('ownerId')
              if (!ownerId || ownerId === 'all') return 'Todos'
              const owner = users.find(u => u.id === ownerId)
              return owner ? (owner.name || owner.email || 'Utilizador') : 'Todos'
            })()}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name || user.email || 'Utilizador'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type Filter */}
      <Select
        value={searchParams.get('onboardingType') || 'all'}
        onValueChange={(value) => handleFilterChange('onboardingType', value)}
      >
        <SelectTrigger className="w-[140px]">
          <span className="truncate">
            {(() => {
              const type = searchParams.get('onboardingType')
              if (!type || type === 'all') return 'Todos'
              return type === 'urgente' ? 'Urgente' : 'Normal'
            })()}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="urgente">Urgente</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  )
}
