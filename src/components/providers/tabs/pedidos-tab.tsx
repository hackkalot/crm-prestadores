'use client'

import { useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  X,
  Eye,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
} from 'lucide-react'
import {
  getProviderServiceRequests,
  type PaginatedServiceRequests,
  type ProviderServiceRequestFilters,
} from '@/lib/service-requests/actions'

interface PedidosTabProps {
  backofficeProviderId: number
  initialData: PaginatedServiceRequests
  categories: string[]
  districts: string[]
  statuses: string[]
}

function getStatusBadgeVariant(status: string) {
  if (status === 'Novo pedido') return 'secondary'
  if (status === 'Atribuir prestador') return 'outline'
  if (status === 'Prestador atribuído') return 'default'
  if (status === 'Concluído') return 'default'
  if (status?.includes('Cancelado')) return 'destructive'
  return 'secondary'
}

function getStatusColor(status: string) {
  if (status === 'Novo pedido') return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
  if (status === 'Atribuir prestador') return 'bg-orange-100 text-orange-800 hover:bg-orange-100'
  if (status === 'Prestador atribuído') return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
  if (status === 'Concluído') return 'bg-green-100 text-green-800 hover:bg-green-100'
  if (status?.includes('Cancelado')) return 'bg-red-100 text-red-800 hover:bg-red-100'
  return ''
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PedidosTab({
  backofficeProviderId,
  initialData,
  categories,
  districts,
  statuses,
}: PedidosTabProps) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState(initialData)

  // Filter state
  const [filters, setFilters] = useState<ProviderServiceRequestFilters>({
    page: 1,
    limit: 25,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()

  const fetchData = useCallback(
    async (newFilters: ProviderServiceRequestFilters) => {
      startTransition(async () => {
        const result = await getProviderServiceRequests(backofficeProviderId, newFilters)
        setData(result)
      })
    },
    [backofficeProviderId]
  )

  const updateFilter = useCallback(
    (key: keyof ProviderServiceRequestFilters, value: string | number) => {
      const newFilters = {
        ...filters,
        [key]: value === 'all' ? undefined : value,
        page: key === 'page' ? (value as number) : 1, // Reset page when changing filters
      }
      setFilters(newFilters)
      fetchData(newFilters)
    },
    [filters, fetchData]
  )

  const handleSearch = useCallback(() => {
    const newFilters = { ...filters, search: search || undefined, page: 1 }
    setFilters(newFilters)
    fetchData(newFilters)
  }, [filters, search, fetchData])

  const handleDateFilter = useCallback(() => {
    const newFilters = {
      ...filters,
      dateFrom: dateFrom?.toISOString().split('T')[0],
      dateTo: dateTo?.toISOString().split('T')[0],
      page: 1,
    }
    setFilters(newFilters)
    fetchData(newFilters)
  }, [filters, dateFrom, dateTo, fetchData])

  const handleSort = useCallback(
    (column: string) => {
      const newSortOrder =
        filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc'
      const newFilters = { ...filters, sortBy: column, sortOrder: newSortOrder as 'asc' | 'desc' }
      setFilters(newFilters)
      fetchData(newFilters)
    },
    [filters, fetchData]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      const newFilters = { ...filters, page: newPage }
      setFilters(newFilters)
      fetchData(newFilters)
    },
    [filters, fetchData]
  )

  const handleLimitChange = useCallback(
    (newLimit: string) => {
      const newFilters = { ...filters, limit: parseInt(newLimit), page: 1 }
      setFilters(newFilters)
      fetchData(newFilters)
    },
    [filters, fetchData]
  )

  const clearFilters = useCallback(() => {
    setSearch('')
    setDateFrom(undefined)
    setDateTo(undefined)
    const newFilters: ProviderServiceRequestFilters = {
      page: 1,
      limit: 25,
      sortBy: 'created_at',
      sortOrder: 'desc',
    }
    setFilters(newFilters)
    fetchData(newFilters)
  }, [fetchData])

  const getSortIcon = (column: string) => {
    if (filters.sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return filters.sortOrder === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    )
  }

  const hasFilters =
    filters.status ||
    filters.category ||
    filters.district ||
    filters.search ||
    filters.dateFrom ||
    filters.dateTo

  const { data: pedidos, total, page, limit, totalPages } = data
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-[180px]"
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Status filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => updateFilter('status', value)}
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
          value={filters.category || 'all'}
          onValueChange={(value) => updateFilter('category', value)}
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
          value={filters.district || 'all'}
          onValueChange={(value) => updateFilter('district', value)}
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

        {/* Date from */}
        <DatePicker
          value={dateFrom || null}
          onChange={(date) => setDateFrom(date)}
          placeholder="Data de"
          className="w-36"
          toDate={dateTo}
        />

        {/* Date to */}
        <DatePicker
          value={dateTo || null}
          onChange={(date) => setDateTo(date)}
          placeholder="Data ate"
          className="w-36"
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
      </div>

      {/* Empty state */}
      {pedidos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum pedido encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasFilters
                ? 'Tenta ajustar os filtros de pesquisa'
                : 'Este prestador ainda nao tem pedidos atribuidos'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pagination Controls - Top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                A mostrar{' '}
                <span className="font-medium text-foreground">
                  {startItem}-{endItem}
                </span>{' '}
                de <span className="font-medium text-foreground">{total}</span> registos
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Itens por pagina:</span>
                <Select value={limit.toString()} onValueChange={handleLimitChange}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina <span className="font-medium text-foreground">{page}</span> de{' '}
                <span className="font-medium text-foreground">{totalPages}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                Seguinte
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">
                    <button
                      onClick={() => handleSort('request_code')}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Codigo
                      {getSortIcon('request_code')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Data Submissao
                      {getSortIcon('created_at')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('service')}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Servico
                      {getSortIcon('service')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('city')}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Morada
                      {getSortIcon('city')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('scheduled_to')}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Data Prestacao
                      {getSortIcon('scheduled_to')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Estado
                      {getSortIcon('status')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((pedido) => (
                  <TableRow key={pedido.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <Link
                        href={`/pedidos/${pedido.request_code}`}
                        className="text-primary hover:underline"
                      >
                        {pedido.request_code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(pedido.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="font-medium truncate">{pedido.service || '-'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {pedido.category}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1 text-sm max-w-[180px]">
                        <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="truncate">
                          <p className="truncate">{pedido.city || '-'}</p>
                          <p className="text-xs text-muted-foreground">
                            {pedido.client_district}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pedido.scheduled_to ? (
                        <div className="text-sm">{formatDate(pedido.scheduled_to)}</div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(pedido.status)}
                        className={getStatusColor(pedido.status)}
                      >
                        {pedido.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/pedidos/${pedido.request_code}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
