'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import Link from 'next/link'
import { saveBackUrl } from '@/hooks/use-navigation-state'
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
import {
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import type { PaginatedBillingProcesses } from '@/lib/billing/actions'

interface FaturacaoListProps {
  paginatedResult: PaginatedBillingProcesses
}

function getStatusBadgeVariant(status: string | null) {
  const s = status?.toLowerCase() || ''
  if (s === 'por enviar') return 'secondary'
  if (s === 'em análise' || s === 'em analise') return 'default'
  if (s === 'não aceite' || s === 'nao aceite') return 'destructive'
  if (s === 'aceite') return 'default'
  if (s === 'pago') return 'default'
  if (s === 'arquivado') return 'secondary'
  return 'secondary'
}

function getStatusColor(status: string | null) {
  const s = status?.toLowerCase() || ''
  if (s === 'por enviar') return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
  if (s === 'em análise' || s === 'em analise')
    return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
  if (s === 'não aceite' || s === 'nao aceite')
    return 'bg-red-100 text-red-800 hover:bg-red-100'
  if (s === 'aceite') return 'bg-green-100 text-green-800 hover:bg-green-100'
  if (s === 'pago') return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  if (s === 'arquivado') return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
  return ''
}

function formatDate(date: string | null) {
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

export function FaturacaoList({ paginatedResult }: FaturacaoListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: billing, total, page, limit, totalPages } = paginatedResult

  const sortBy = searchParams.get('sortBy') || 'document_date'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  // Save current URL before navigating to pedido detail
  const handlePedidoClick = useCallback(() => {
    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    saveBackUrl(currentUrl, 'faturacao')
  }, [pathname, searchParams])

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams.toString())

    // Toggle sort order if clicking same column
    if (sortBy === column) {
      params.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sortBy', column)
      params.set('sortOrder', 'desc')
    }

    router.push(`/faturacao?${params.toString()}`)
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
    router.push(`/faturacao?${params.toString()}`)
  }

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', newLimit)
    params.set('page', '1') // Reset to page 1 when changing limit
    router.push(`/faturacao?${params.toString()}`)
  }

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  if (billing.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum processo de faturacao encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pagination Controls - Top */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            A mostrar{' '}
            <span className="font-medium text-foreground">
              {startItem}-{endItem}
            </span>{' '}
            de <span className="font-medium text-foreground">{total}</span>{' '}
            registos
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Itens por pagina:
            </span>
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
            Pagina <span className="font-medium text-foreground">{page}</span>{' '}
            de <span className="font-medium text-foreground">{totalPages}</span>
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
                  onClick={() => handleSort('document_date')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Data Documento
                  {getSortIcon('document_date')}
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
                  onClick={() => handleSort('assigned_provider_name')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Prestador
                  {getSortIcon('assigned_provider_name')}
                </button>
              </TableHead>
              <TableHead>N. Documento</TableHead>
              <TableHead className="text-right">
                <button
                  onClick={() => handleSort('total_invoice_value')}
                  className="flex items-center justify-end hover:text-foreground transition-colors ml-auto"
                >
                  Valor Fatura
                  {getSortIcon('total_invoice_value')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('process_status')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Estado
                  {getSortIcon('process_status')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('payment_date')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Data Pagamento
                  {getSortIcon('payment_date')}
                </button>
              </TableHead>
              <TableHead className="w-[80px]">Flags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billing.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">
                  <Link
                    href={`/pedidos/${item.request_code}`}
                    className="text-primary hover:underline"
                    onClick={handlePedidoClick}
                  >
                    {item.request_code}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {formatDate(item.document_date)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[180px]">
                    <p className="truncate">{item.service || '-'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {item.assigned_provider_name ? (
                    <div className="flex items-center gap-1 text-sm max-w-[150px]">
                      <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">
                        {item.assigned_provider_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.document_number ? (
                    <div className="flex items-center gap-1 text-sm">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span>{item.document_number}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.total_invoice_value)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={getStatusBadgeVariant(item.process_status)}
                    className={getStatusColor(item.process_status)}
                  >
                    {item.process_status || '-'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.payment_date ? (
                    <div className="flex items-center gap-1 text-sm text-emerald-600">
                      <CheckCircle className="h-3 w-3" />
                      {formatDate(item.payment_date)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {item.has_duplicate && (
                      <span title="Duplicado">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </span>
                    )}
                    {item.complaint && (
                      <span title="Reclamacao">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </span>
                    )}
                  </div>
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
            A mostrar{' '}
            <span className="font-medium text-foreground">
              {startItem}-{endItem}
            </span>{' '}
            de <span className="font-medium text-foreground">{total}</span>{' '}
            registos
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
            Pagina <span className="font-medium text-foreground">{page}</span>{' '}
            de <span className="font-medium text-foreground">{totalPages}</span>
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
