'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProviderLink } from '@/components/ui/provider-link'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  User,
  Briefcase,
  Building2,
  MapPin,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
} from 'lucide-react'
import type { PaginatedPrestadores } from '@/lib/prestadores/actions'

interface PrestadoresListProps {
  prestadores: PaginatedPrestadores
  requestCounts?: Record<number, number>
}

const entityTypeLabels: Record<string, string> = {
  tecnico: 'Tecnico',
  eni: 'ENI',
  empresa: 'Empresa',
}

const entityTypeIcons: Record<string, typeof User> = {
  tecnico: User,
  eni: Briefcase,
  empresa: Building2,
}

const statusLabels: Record<string, string> = {
  novo: 'Nova Candidatura',
  em_onboarding: 'Em Onboarding',
  on_hold: 'On-Hold',
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  abandonado: 'Abandonado',
  arquivado: 'Arquivado',
}

const statusVariants: Record<string, 'info' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
  novo: 'info',
  em_onboarding: 'warning',
  on_hold: 'warning',
  ativo: 'success',
  suspenso: 'destructive',
  abandonado: 'secondary',
  arquivado: 'secondary',
}

export function PrestadoresList({ prestadores, requestCounts = {} }: PrestadoresListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data, total, page, limit, totalPages } = prestadores

  const sortBy = searchParams.get('sortBy') || 'name'
  const sortOrder = searchParams.get('sortOrder') || 'asc'

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (sortBy === column) {
      params.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sortBy', column)
      params.set('sortOrder', 'asc')
    }

    params.set('page', '1')
    router.push(`/prestadores?${params.toString()}`)
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/prestadores?${params.toString()}`)
  }

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', newLimit)
    params.set('page', '1')
    router.push(`/prestadores?${params.toString()}`)
  }

  if (data.length === 0 && total === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Nenhum prestador encontrado com os filtros selecionados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pagination Controls - Top */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            A mostrar <span className="font-medium text-foreground">{data.length}</span> de{' '}
            <span className="font-medium text-foreground">{total}</span> prestadores
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
            <span className="font-medium text-foreground">{totalPages || 1}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Seguinte
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Prestador
                  {getSortIcon('name')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('entity_type')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Tipo
                  {getSortIcon('entity_type')}
                </button>
              </TableHead>
              <TableHead>Zonas</TableHead>
              <TableHead>Serviços</TableHead>
              <TableHead className="text-center">Pedidos</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Estado
                  {getSortIcon('status')}
                </button>
              </TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((prestador) => {
              const EntityIcon = entityTypeIcons[prestador.entity_type] || User

              return (
                <TableRow key={prestador.id} className="group">
                  <TableCell>
                    <ProviderLink
                      href={`/providers/${prestador.id}?tab=perfil`}
                      className="flex items-center gap-3 hover:text-primary transition-colors"
                    >
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <EntityIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{prestador.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{prestador.email}</p>
                      </div>
                    </ProviderLink>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {entityTypeLabels[prestador.entity_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[150px]">
                        {prestador.districts?.slice(0, 2).join(', ')}
                        {prestador.districts && prestador.districts.length > 2 && '...'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex items-center gap-1">
                      {prestador.services && prestador.services.length > 0 && (
                        <Badge variant="secondary" className="text-xs truncate max-w-[140px]">
                          {prestador.services[0]}
                        </Badge>
                      )}
                      {prestador.services && prestador.services.length > 1 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs shrink-0 cursor-default">
                                +{prestador.services.length - 1}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[250px]">
                              <div className="flex flex-col gap-1">
                                {prestador.services.slice(1).map((service: string, idx: number) => (
                                  <span key={idx} className="text-xs">{service}</span>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {prestador.backoffice_provider_id ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ProviderLink
                              href={`/providers/${prestador.id}?tab=pedidos`}
                              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span className="font-medium">
                                {requestCounts[prestador.backoffice_provider_id] || 0}
                              </span>
                            </ProviderLink>
                          </TooltipTrigger>
                          <TooltipContent>Ver pedidos</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariants[prestador.status || ''] || 'secondary'}
                    >
                      {statusLabels[prestador.status || ''] || prestador.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {prestador.relationship_owner?.name || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ProviderLink href={`/providers/${prestador.id}?tab=perfil`}>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </ProviderLink>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls - Bottom */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
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
            disabled={page >= totalPages}
          >
            Seguinte
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
