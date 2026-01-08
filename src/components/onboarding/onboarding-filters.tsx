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

const entityOptions = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'eni', label: 'ENI' },
  { value: 'empresa', label: 'Empresa' },
]

interface OnboardingFiltersProps {
  users: Array<{ id: string; name: string | null; email?: string }>
  districts: string[]
}

export function OnboardingFilters({ users, districts }: OnboardingFiltersProps) {
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
    searchParams.has('onboardingType') ||
    searchParams.has('entityType') ||
    searchParams.has('district')

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
              if (!ownerId || ownerId === 'all') return 'Responsável'
              const owner = users.find(u => u.id === ownerId)
              return owner ? (owner.name || owner.email || 'Utilizador') : 'Responsável'
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

      {/* Onboarding Type Filter */}
      <Select
        value={searchParams.get('onboardingType') || 'all'}
        onValueChange={(value) => handleFilterChange('onboardingType', value)}
      >
        <SelectTrigger className="w-[120px]">
          <span className="truncate">
            {(() => {
              const type = searchParams.get('onboardingType')
              if (!type || type === 'all') return 'Tipo'
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

      {/* Entity Type Filter */}
      <Select
        value={searchParams.get('entityType') || 'all'}
        onValueChange={(value) => handleFilterChange('entityType', value)}
      >
        <SelectTrigger className="w-[140px]">
          <span className="truncate">
            {(() => {
              const type = searchParams.get('entityType')
              const option = entityOptions.find(o => o.value === type)
              return option?.label || 'Entidade'
            })()}
          </span>
        </SelectTrigger>
        <SelectContent>
          {entityOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* District Filter */}
      <Select
        value={searchParams.get('district') || 'all'}
        onValueChange={(value) => handleFilterChange('district', value)}
      >
        <SelectTrigger className="w-[140px]">
          <span className="truncate">
            {searchParams.get('district') || 'Distrito'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {districts.map((district) => (
            <SelectItem key={district} value={district}>
              {district}
            </SelectItem>
          ))}
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
