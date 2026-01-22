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
import { Search, X, Loader2 } from 'lucide-react'
import { ViewToggle } from './view-toggle'
import { useCallback, useState, useTransition, useEffect, useRef } from 'react'

// Debounce delay for search (ms)
const SEARCH_DEBOUNCE_MS = 300

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
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
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

  // Debounced search - triggers automatically as user types
  const triggerSearch = useCallback((searchValue: string) => {
    updateFilters('search', searchValue)
  }, [updateFilters])

  // Handle search input change with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Show searching indicator
    setIsSearching(true)

    // Debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(false)
      triggerSearch(value)
    }, SEARCH_DEBOUNCE_MS)
  }, [triggerSearch])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Immediate search (for Enter key or button click)
  const handleSearch = useCallback(() => {
    // Clear any pending debounced search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    setIsSearching(false)
    triggerSearch(search)
  }, [search, triggerSearch])

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
    // Clear any pending debounced search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    setSearch('')
    setIsSearching(false)
    setDateFrom(undefined)
    setDateTo(undefined)
    router.push('/pedidos')
  }, [router])

  const hasFilters = searchParams.toString().length > 0

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative">
          {isSearching ? (
            <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Pesquisar prestador..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-[200px] pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={handleSearch} disabled={isSearching}>
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
