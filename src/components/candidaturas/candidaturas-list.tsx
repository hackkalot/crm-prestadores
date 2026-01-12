'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CandidaturaCard } from './candidatura-card'
import { SendToOnboardingDialog } from './send-to-onboarding-dialog'
import { AbandonDialog } from './abandon-dialog'
import type { PaginatedCandidaturas } from '@/lib/candidaturas/actions'
import { formatDate } from '@/lib/utils'
import {
  User,
  Briefcase,
  Building2,
  MapPin,
  Send,
  X,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

interface CandidaturasListProps {
  candidaturas: PaginatedCandidaturas
  viewMode?: 'list' | 'grid'
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

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'> = {
  novo: 'info',
  em_onboarding: 'warning',
  abandonado: 'destructive',
  arquivado: 'secondary',
}

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  em_onboarding: 'Em Onboarding',
  abandonado: 'Abandonado',
  arquivado: 'Arquivado',
}

export function CandidaturasList({ candidaturas, viewMode = 'list' }: CandidaturasListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [abandonDialogOpen, setAbandonDialogOpen] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)

  const { data: providers, total, page, limit, totalPages } = candidaturas

  const sortBy = searchParams.get('sortBy') || 'first_application_at'
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

    params.set('page', '1')
    router.push(`/candidaturas?${params.toString()}`)
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
    router.push(`/candidaturas?${params.toString()}`)
  }

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', newLimit)
    params.set('page', '1')
    router.push(`/candidaturas?${params.toString()}`)
  }

  const handleSendToOnboarding = (id: string) => {
    setSelectedProviderId(id)
    setSendDialogOpen(true)
  }

  const handleAbandon = (id: string) => {
    setSelectedProviderId(id)
    setAbandonDialogOpen(true)
  }

  if (providers.length === 0 && total === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">Nenhuma candidatura encontrada</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Pagination Controls - Top */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              A mostrar <span className="font-medium text-foreground">{providers.length}</span> de{' '}
              <span className="font-medium text-foreground">{total}</span> candidaturas
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por pagina:</span>
              <Select value={limit.toString()} onValueChange={handleLimitChange}>
                <SelectTrigger className="w-20">
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
              Pagina <span className="font-medium text-foreground">{page}</span> de{' '}
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

        {/* List View */}
        {viewMode === 'list' && (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Candidato
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
                  <TableHead>Telefone</TableHead>
                  <TableHead>Zonas</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('first_application_at')}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Data
                      {getSortIcon('first_application_at')}
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
                  <TableHead>Acoes</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => {
                  const EntityIcon = entityTypeIcons[provider.entity_type] || User

                  return (
                    <TableRow key={provider.id} className="group">
                      <TableCell>
                        <Link
                          href={`/providers/${provider.id}?tab=perfil`}
                          className="flex items-center gap-3 hover:text-primary transition-colors"
                        >
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <EntityIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{provider.name}</p>
                              {provider.application_count && provider.application_count > 1 && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {provider.application_count}x
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{provider.email}</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entityTypeLabels[provider.entity_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {provider.phone || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">
                            {provider.districts?.slice(0, 2).join(', ') || '-'}
                            {provider.districts && provider.districts.length > 2 && '...'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(provider.first_application_at || provider.created_at || new Date().toISOString())}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={provider.status ? statusVariants[provider.status] : 'default'}>
                          {provider.status ? statusLabels[provider.status] : 'Desconhecido'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {provider.status === 'novo' && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleSendToOnboarding(provider.id)}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Onboarding
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAbandon(provider.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/providers/${provider.id}?tab=perfil`}>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <CandidaturaCard
                key={provider.id}
                provider={provider}
                onSendToOnboarding={handleSendToOnboarding}
                onAbandon={handleAbandon}
              />
            ))}
          </div>
        )}

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
              Pagina <span className="font-medium text-foreground">{page}</span> de{' '}
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

      <SendToOnboardingDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        providerId={selectedProviderId}
      />

      <AbandonDialog
        open={abandonDialogOpen}
        onOpenChange={setAbandonDialogOpen}
        providerId={selectedProviderId}
      />
    </>
  )
}
