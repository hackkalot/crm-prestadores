'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Tables } from '@/types/database'
import { formatDate } from '@/lib/utils'
import {
  Building2,
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Send,
  X,
  ExternalLink,
} from 'lucide-react'

type Provider = Tables<'providers'>

interface CandidaturaCardProps {
  provider: Provider
  onSendToOnboarding: (id: string) => void
  onAbandon: (id: string) => void
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

export function CandidaturaCard({ provider, onSendToOnboarding, onAbandon }: CandidaturaCardProps) {
  const EntityIcon = entityTypeIcons[provider.entity_type] || User

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <Link
            href={`/providers/${provider.id}?tab=perfil`}
            className="flex items-center gap-3 hover:text-primary"
          >
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <EntityIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium group-hover:text-primary">{provider.name}</h3>
              <p className="text-sm text-muted-foreground">
                {entityTypeLabels[provider.entity_type]}
                {provider.nif && ` • NIF: ${provider.nif}`}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={provider.status ? statusVariants[provider.status] : 'default'}>
              {provider.status ? statusLabels[provider.status] : 'Desconhecido'}
            </Badge>
            {provider.application_count && provider.application_count > 1 && (
              <Badge variant="outline" className="text-xs">
                {provider.application_count}x
              </Badge>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="truncate">{provider.email}</span>
          </div>
          {provider.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{provider.phone}</span>
            </div>
          )}
          {provider.districts && provider.districts.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{provider.districts.join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Candidatura: {formatDate(provider.first_application_at || provider.created_at || new Date().toISOString())}</span>
          </div>
        </div>

        {/* Services Tags */}
        {provider.services && provider.services.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {provider.services.slice(0, 3).map((service, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {service}
              </Badge>
            ))}
            {provider.services.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{provider.services.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {provider.status === 'novo' ? (
            <>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onSendToOnboarding(provider.id)}
              >
                <Send className="h-4 w-4 mr-1" />
                Onboarding
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAbandon(provider.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link href={`/candidaturas/${provider.id}`} className="flex-1">
              <Button size="sm" variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver detalhes
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
