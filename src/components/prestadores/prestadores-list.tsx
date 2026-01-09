'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { User, Briefcase, Building2, MapPin, ChevronRight } from 'lucide-react'

interface Prestador {
  id: string
  name: string
  email: string
  phone?: string
  entity_type: string
  nif?: string
  districts?: string[]
  services?: string[]
  status: string
  activated_at?: string
  relationship_owner?: {
    id: string
    name: string
  }
}

interface PrestadoresListProps {
  prestadores: Prestador[]
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
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  abandonado: 'Abandonado',
}

const statusVariants: Record<string, 'info' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
  novo: 'info',
  em_onboarding: 'warning',
  ativo: 'success',
  suspenso: 'destructive',
  abandonado: 'secondary',
}

export function PrestadoresList({ prestadores }: PrestadoresListProps) {
  if (prestadores.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Nenhum prestador encontrado com os filtros selecionados.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prestador</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Zonas</TableHead>
            <TableHead>Serviços</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prestadores.map((prestador) => {
            const EntityIcon = entityTypeIcons[prestador.entity_type] || User

            return (
              <TableRow key={prestador.id} className="group">
                <TableCell>
                  <Link
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
                  </Link>
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
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {prestador.services?.slice(0, 2).map((service) => (
                      <Badge key={service} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                    {prestador.services && prestador.services.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{prestador.services.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={statusVariants[prestador.status] || 'secondary'}
                  >
                    {statusLabels[prestador.status] || prestador.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {prestador.relationship_owner?.name || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <Link href={`/providers/${prestador.id}?tab=perfil`}>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
