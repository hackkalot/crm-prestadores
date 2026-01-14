'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { saveBackUrl } from '@/hooks/use-navigation-state'
import type { Database } from '@/types/database'

type AllocationHistory = Database['public']['Tables']['allocation_history']['Row'] & {
  provider_uuid?: string | null
}

interface AlocacoesListProps {
  data: AllocationHistory[]
  total: number
  page: number
  limit: number
}

interface SortableHeaderProps {
  field: string
  label: string
  currentSort: string
  currentDir: 'asc' | 'desc'
  onSort: (field: string) => void
}

function SortableHeader({ field, label, currentSort, currentDir, onSort }: SortableHeaderProps) {
  const isActive = currentSort === field

  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  )
}

export function AlocacoesList({ data, total, page, limit }: AlocacoesListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sortField = searchParams.get('sort') || 'requests_received'

  // Save current URL before navigating to provider detail
  const handleProviderClick = useCallback(() => {
    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    saveBackUrl(currentUrl, 'alocacoes')
  }, [pathname, searchParams])
  const sortDir = (searchParams.get('dir') || 'desc') as 'asc' | 'desc'

  const totalPages = Math.ceil(total / limit)

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      params.set(key, value)
    })
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction
      updateParams({ sort: field, dir: sortDir === 'asc' ? 'desc' : 'asc' })
    } else {
      // New field, default to descending
      updateParams({ sort: field, dir: 'desc' })
    }
  }

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) })
  }

  const calculateAcceptanceRate = (received: number, accepted: number) => {
    if (received === 0) return 0
    return Math.round((accepted / received) * 100)
  }

  const calculateExpirationRate = (received: number, expired: number) => {
    if (received === 0) return 0
    return Math.round((expired / received) * 100)
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          Nenhum registo de alocação encontrado.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Execute uma sincronização para importar dados do backoffice.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                field="provider_name"
                label="Prestador"
                currentSort={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                field="requests_received"
                label="Recebidos"
                currentSort={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                field="requests_accepted"
                label="Aceites"
                currentSort={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                field="requests_rejected"
                label="Rejeitados"
                currentSort={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                field="requests_expired"
                label="Expirados"
                currentSort={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <TableHead>Taxa Aceitação</TableHead>
              <TableHead>Taxa Expiração</TableHead>
              <SortableHeader
                field="avg_response_time_raw"
                label="Tempo Médio"
                currentSort={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const acceptanceRate = calculateAcceptanceRate(row.requests_received || 0, row.requests_accepted || 0)
              const expirationRate = calculateExpirationRate(row.requests_received || 0, row.requests_expired || 0)

              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.provider_uuid ? (
                      <Link
                        href={`/providers/${row.provider_uuid}`}
                        className="text-primary hover:underline"
                        onClick={handleProviderClick}
                      >
                        {row.provider_name}
                      </Link>
                    ) : (
                      row.provider_name
                    )}
                  </TableCell>
                  <TableCell>{row.requests_received?.toLocaleString('pt-PT') || 0}</TableCell>
                  <TableCell className="text-green-600">
                    {row.requests_accepted?.toLocaleString('pt-PT') || 0}
                  </TableCell>
                  <TableCell className="text-red-600">
                    {row.requests_rejected?.toLocaleString('pt-PT') || 0}
                  </TableCell>
                  <TableCell className="text-amber-600">
                    {row.requests_expired?.toLocaleString('pt-PT') || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            acceptanceRate >= 70 ? 'bg-green-500' :
                            acceptanceRate >= 40 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${acceptanceRate}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-10">{acceptanceRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            expirationRate <= 10 ? 'bg-green-500' :
                            expirationRate <= 30 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${expirationRate}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-10">{expirationRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.avg_response_time_raw || '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          A mostrar {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} registos
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Seguinte
          </Button>
        </div>
      </div>
    </div>
  )
}
