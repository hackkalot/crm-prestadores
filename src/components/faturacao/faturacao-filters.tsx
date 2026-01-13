'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface FaturacaoFiltersProps {
  providers: string[]
  services: string[]
  statuses: string[]
}

export function FaturacaoFilters({
  providers,
  services,
  statuses,
}: FaturacaoFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')

  // Update search state when URL changes
  useEffect(() => {
    setSearch(searchParams.get('search') || '')
  }, [searchParams])

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1') // Reset to page 1 when filtering
    router.push(`/faturacao?${params.toString()}`)
  }

  const handleSearch = () => {
    updateFilter('search', search)
  }

  const clearFilters = () => {
    router.push('/faturacao')
    setSearch('')
  }

  const hasFilters =
    searchParams.get('status') ||
    searchParams.get('provider') ||
    searchParams.get('service') ||
    searchParams.get('search') ||
    searchParams.get('dateFrom') ||
    searchParams.get('dateTo')

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input
            placeholder="Pesquisar codigo, prestador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-[280px] pr-8"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('')
                updateFilter('search', '')
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Status Filter */}
      <Select
        value={searchParams.get('status') || 'all'}
        onValueChange={(value) => updateFilter('status', value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os estados</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Provider Filter */}
      <Select
        value={searchParams.get('provider') || 'all'}
        onValueChange={(value) => updateFilter('provider', value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Prestador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os prestadores</SelectItem>
          {providers.map((provider) => (
            <SelectItem key={provider} value={provider}>
              {provider}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Service Filter */}
      <Select
        value={searchParams.get('service') || 'all'}
        onValueChange={(value) => updateFilter('service', value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Servico" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os servicos</SelectItem>
          {services.map((service) => (
            <SelectItem key={service} value={service}>
              {service}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date From */}
      <Input
        type="date"
        placeholder="Data inicio"
        value={searchParams.get('dateFrom') || ''}
        onChange={(e) => updateFilter('dateFrom', e.target.value)}
        className="w-[150px]"
      />

      {/* Date To */}
      <Input
        type="date"
        placeholder="Data fim"
        value={searchParams.get('dateTo') || ''}
        onChange={(e) => updateFilter('dateTo', e.target.value)}
        className="w-[150px]"
      />

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
