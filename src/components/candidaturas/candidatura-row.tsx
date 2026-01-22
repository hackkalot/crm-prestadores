'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Tables } from '@/types/database'
import { formatDate } from '@/lib/utils'
import {
  Building2,
  User,
  Briefcase,
  Send,
  X,
  ChevronRight,
} from 'lucide-react'

type Provider = Tables<'providers'>

interface CandidaturaRowProps {
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
  on_hold: 'warning',
  abandonado: 'destructive',
  arquivado: 'secondary',
}

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  em_onboarding: 'Em Onboarding',
  on_hold: 'On-Hold',
  abandonado: 'Abandonado',
  arquivado: 'Arquivado',
}

export function CandidaturaRow({ provider, onSendToOnboarding, onAbandon }: CandidaturaRowProps) {
  const EntityIcon = entityTypeIcons[provider.entity_type] || User

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow group">
      {/* Icon */}
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <EntityIcon className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Name & Email - Clickable */}
      <Link
        href={`/providers/${provider.id}?tab=perfil`}
        className="min-w-40 flex-1 hover:text-primary"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate group-hover:text-primary">{provider.name}</h3>
            {provider.application_count && provider.application_count > 1 && (
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {provider.application_count}x
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{provider.email}</p>
        </div>
      </Link>

      {/* Type */}
      <div className="w-24 shrink-0 hidden sm:block text-center">
        <span className="text-sm">{entityTypeLabels[provider.entity_type]}</span>
      </div>

      {/* Phone */}
      <div className="w-32 shrink-0 hidden md:block text-center">
        <span className="text-sm text-muted-foreground">{provider.phone || '-'}</span>
      </div>

      {/* Districts */}
      <div className="w-40 shrink-0 hidden lg:block text-center">
        <span className="text-sm text-muted-foreground truncate block">
          {provider.districts?.slice(0, 2).join(', ') || '-'}
          {provider.districts && provider.districts.length > 2 && ` +${provider.districts.length - 2}`}
        </span>
      </div>

      {/* Date */}
      <div className="w-28 shrink-0 hidden xl:block text-center">
        <span className="text-sm text-muted-foreground">
          {formatDate(provider.first_application_at || provider.created_at || new Date().toISOString())}
        </span>
      </div>

      {/* Status */}
      <div className="w-32 shrink-0 text-center">
        <Badge variant={provider.status ? statusVariants[provider.status] : 'default'}>
          {provider.status ? statusLabels[provider.status] : 'Desconhecido'}
        </Badge>
      </div>

      {/* Actions */}
      <div className="w-30 shrink-0 flex items-center justify-center gap-1">
        {provider.status === 'novo' && (
          <>
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                onSendToOnboarding(provider.id)
              }}
            >
              <Send className="h-4 w-4 mr-1" />
              Onboarding
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault()
                onAbandon(provider.id)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
        <Link href={`/providers/${provider.id}?tab=perfil`}>
          <Button size="sm" variant="ghost">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
