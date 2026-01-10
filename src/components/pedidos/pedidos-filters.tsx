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
import { DatePicker } from '@/components/ui/date-picker'
import { Search, X } from 'lucide-react'
import { ViewToggle } from './view-toggle'
import { useCallback, useState, useTransition } from 'react'

interface PedidosFiltersProps {
  categories: string[]
  districts: string[]
  providers: string[]
  statuses: string[]
}

export function PedidosFilters({
  categories,
  districts,
  providers,
  statuses,
}: PedidosFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined
  )
  const [dateTo, setDateTo] = useState<Date | undefined>(
    searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined
  )

  const updateFilters = useCallback(
    (key: string, value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value !== 'all') {
          params.set(key, value)
        } else {
          params.delete(key)
        }
        router.push(`/pedidos?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const handleSearch = useCallback(() => {
    updateFilters('search', search)
  }, [search, updateFilters])

  const handleDateFilter = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (dateFrom) {
        params.set('dateFrom', dateFrom.toISOString().split('T')[0])
      } else {
        params.delete('dateFrom')
      }
      if (dateTo) {
        params.set('dateTo', dateTo.toISOString().split('T')[0])
      } else {
        params.delete('dateTo')
      }
      router.push(`/pedidos?${params.toString()}`)
    })
  }, [dateFrom, dateTo, router, searchParams])

  const clearFilters = useCallback(() => {
    setSearch('')
    setDateFrom(undefined)
    setDateTo(undefined)
    router.push('/pedidos')
  }, [router])

  const hasFilters = searchParams.toString().length > 0

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Pesquisar prestador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-[200px]"
        />
        <Button variant="outline" size="icon" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Status filter */}
      <Select
        value={searchParams.get('status') || undefined}
        onValueChange={(value) => updateFilters('status', value)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category filter */}
      <Select
        value={searchParams.get('category') || undefined}
        onValueChange={(value) => updateFilters('category', value)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* District filter */}
      <Select
        value={searchParams.get('district') || undefined}
        onValueChange={(value) => updateFilters('district', value)}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Distrito" />
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

      {/* Provider filter */}
      <Select
        value={searchParams.get('provider') || undefined}
        onValueChange={(value) => updateFilters('provider', value)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Prestador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {providers.map((provider) => (
            <SelectItem key={provider} value={provider}>
              {provider}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date from */}
      <DatePicker
        value={dateFrom || null}
        onChange={(date) => setDateFrom(date)}
        placeholder="Data de"
        className="w-40"
        toDate={dateTo}
      />

      {/* Date to */}
      <DatePicker
        value={dateTo || null}
        onChange={(date) => setDateTo(date)}
        placeholder="Data até"
        className="w-40"
        fromDate={dateFrom}
      />

      {/* Apply dates button */}
      {(dateFrom || dateTo) && (
        <Button variant="outline" size="sm" onClick={handleDateFilter}>
          Aplicar
        </Button>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}

      {isPending && (
        <span className="text-sm text-muted-foreground">A carregar...</span>
      )}

      {/* View Toggle */}
      <div className="ml-auto">
        <ViewToggle />
      </div>
    </div>
  )
}
