'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type { Tables } from '@/types/database'
import { formatDate } from '@/lib/utils'
import {
  LayoutGrid,
  List,
  User,
  Briefcase,
  Building2,
  MapPin,
  Send,
  X,
  ChevronRight,
} from 'lucide-react'

type Provider = Tables<'providers'>

interface CandidaturasListProps {
  providers: Provider[]
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
}

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  em_onboarding: 'Em Onboarding',
  abandonado: 'Abandonado',
}

export function CandidaturasList({ providers }: CandidaturasListProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [abandonDialogOpen, setAbandonDialogOpen] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)

  const handleSendToOnboarding = (id: string) => {
    setSelectedProviderId(id)
    setSendDialogOpen(true)
  }

  const handleAbandon = (id: string) => {
    setSelectedProviderId(id)
    setAbandonDialogOpen(true)
  }

  if (providers.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">Nenhuma candidatura encontrada</p>
      </div>
    )
  }

  return (
    <>
      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8 px-3"
          >
            <List className="h-4 w-4 mr-1" />
            Lista
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-8 px-3"
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Grelha
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Zonas</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ações</TableHead>
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
                        href={`/providers/${provider.id}?tab=candidatura`}
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
                      <Link href={`/providers/${provider.id}?tab=candidatura`}>
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
