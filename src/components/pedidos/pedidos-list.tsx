'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, MapPin, Calendar, User, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { PaginatedServiceRequests } from '@/lib/service-requests/actions'

interface PedidosListProps {
  paginatedResult: PaginatedServiceRequests
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

function formatDateShort(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export function PedidosList({ paginatedResult }: PedidosListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: pedidos, total, page, limit, totalPages } = paginatedResult

  const sortBy = searchParams.get('sortBy') || 'created_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams.toString())

    // Toggle sort order if clicking same column
    if (sortBy === column) {
      params.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sortBy', column)
      params.set('sortOrder', 'asc')
    }

    router.push(`/pedidos?${params.toString()}`)
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    )
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/pedidos?${params.toString()}`)
  }

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', newLimit)
    params.set('page', '1') // Reset to page 1 when changing limit
    router.push(`/pedidos?${params.toString()}`)
  }

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  if (pedidos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum pedido encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pagination Controls - Top */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            A mostrar <span className="font-medium text-foreground">{startItem}-{endItem}</span> de{' '}
            <span className="font-medium text-foreground">{total}</span> registos
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Itens por página:</span>
            <Select value={limit.toString()} onValueChange={handleLimitChange}>
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
                <SelectItem value="500">500</SelectItem>
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
            Página <span className="font-medium text-foreground">{page}</span> de{' '}
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
                  Código
                  {getSortIcon('request_code')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Data Submissão
                  {getSortIcon('created_at')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('service')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Serviço
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
                  Data Prestação
                  {getSortIcon('scheduled_to')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('assigned_provider_name')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Prestador
                  {getSortIcon('assigned_provider_name')}
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
              <TableHead className="text-right">FID ID</TableHead>
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
                    <p className="truncate">{pedido.service_address_line_1 || '-'}</p>
                    <p className="text-xs text-muted-foreground">
                      {pedido.zip_code} {pedido.city}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {pedido.scheduled_to ? (
                  <div className="text-sm">
                    {formatDate(pedido.scheduled_to)}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {pedido.assigned_provider_name ? (
                  <div className="flex items-center gap-1 text-sm max-w-[150px]">
                    <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{pedido.assigned_provider_name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Nao atribuido</span>
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
              <TableCell className="text-right text-sm text-muted-foreground">
                {pedido.fid_id || '-'}
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

      {/* Pagination Controls - Bottom */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            A mostrar <span className="font-medium text-foreground">{startItem}-{endItem}</span> de{' '}
            <span className="font-medium text-foreground">{total}</span> registos
          </p>
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
            Página <span className="font-medium text-foreground">{page}</span> de{' '}
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
    </div>
  )
}
