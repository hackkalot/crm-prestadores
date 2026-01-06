import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCandidaturaById, getApplicationHistory } from '@/lib/candidaturas/actions'
import { formatDate, formatDateTime } from '@/lib/utils'
import { CandidaturaActions } from '@/components/candidaturas/candidatura-actions'
import {
  ArrowLeft,
  Building2,
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  Clock,
  FileText,
  Users,
  Truck,
  Hash,
} from 'lucide-react'

interface CandidaturaDetailPageProps {
  params: Promise<{ id: string }>
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
  ativo: 'success',
  suspenso: 'secondary',
  abandonado: 'destructive',
}

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  em_onboarding: 'Em Onboarding',
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  abandonado: 'Abandonado',
}

export default async function CandidaturaDetailPage({ params }: CandidaturaDetailPageProps) {
  const { id } = await params

  const [provider, history] = await Promise.all([
    getCandidaturaById(id),
    getApplicationHistory(id),
  ])

  if (!provider) {
    notFound()
  }

  const EntityIcon = entityTypeIcons[provider.entity_type] || User

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Detalhes da Candidatura"
        description={provider.name}
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Back button */}
        <div className="flex items-center justify-between">
          <Link href="/candidaturas">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>

          {/* Actions */}
          {provider.status === 'novo' && (
            <CandidaturaActions providerId={provider.id} />
          )}
        </div>

        {/* Main Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <EntityIcon className="h-10 w-10 text-muted-foreground" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{provider.name}</h2>
                  <Badge variant={statusVariants[provider.status]}>
                    {statusLabels[provider.status]}
                  </Badge>
                  {provider.application_count > 1 && (
                    <Badge variant="outline">
                      {provider.application_count} candidaturas
                    </Badge>
                  )}
                </div>

                <p className="text-muted-foreground mb-4">
                  {entityTypeLabels[provider.entity_type]}
                  {provider.nif && ` • NIF: ${provider.nif}`}
                </p>

                {/* Contact Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${provider.email}`} className="text-primary hover:underline">
                      {provider.email}
                    </a>
                  </div>

                  {provider.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${provider.phone}`} className="hover:underline">
                        {provider.phone}
                      </a>
                    </div>
                  )}

                  {provider.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                        {provider.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Districts */}
              {provider.districts && provider.districts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Distritos
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {provider.districts.map((district: string, i: number) => (
                      <Badge key={i} variant="secondary">{district}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {provider.services && provider.services.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Servicos
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {provider.services.map((service: string, i: number) => (
                      <Badge key={i} variant="outline">{service}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Company specific info */}
              {(provider.entity_type === 'empresa' || provider.entity_type === 'eni') && (
                <>
                  {provider.num_technicians && (
                    <div className="flex items-center justify-between py-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Numero de tecnicos
                      </div>
                      <span className="font-medium">{provider.num_technicians}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Equipa administrativa
                    </div>
                    <Badge variant={provider.has_admin_team ? 'success' : 'secondary'}>
                      {provider.has_admin_team ? 'Sim' : 'Nao'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      Transporte proprio
                    </div>
                    <Badge variant={provider.has_own_transport ? 'success' : 'secondary'}>
                      {provider.has_own_transport ? 'Sim' : 'Nao'}
                    </Badge>
                  </div>
                </>
              )}

              {/* Working Hours */}
              {provider.working_hours && (
                <div className="flex items-center justify-between py-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Horario laboral
                  </div>
                  <span className="text-sm">{provider.working_hours}</span>
                </div>
              )}

              {/* HubSpot ID */}
              {provider.hubspot_contact_id && (
                <div className="flex items-center justify-between py-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    HubSpot ID
                  </div>
                  <span className="text-sm font-mono">{provider.hubspot_contact_id}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Dates */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Primeira candidatura</p>
                      <p className="text-xs text-muted-foreground">
                        {provider.first_application_at
                          ? formatDateTime(provider.first_application_at)
                          : formatDateTime(provider.created_at)
                        }
                      </p>
                    </div>
                  </div>

                  {provider.onboarding_started_at && (
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Inicio do onboarding</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(provider.onboarding_started_at)}
                        </p>
                      </div>
                    </div>
                  )}

                  {provider.activated_at && (
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Ativacao</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(provider.activated_at)}
                        </p>
                      </div>
                    </div>
                  )}

                  {provider.abandoned_at && (
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Abandono</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(provider.abandoned_at)}
                        </p>
                        {provider.abandonment_reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Motivo: {provider.abandonment_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Application History */}
                {history.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-3">Candidaturas ({history.length})</h4>
                    <div className="space-y-2">
                      {history.map((app: { id: string; applied_at: string; source: string }, index: number) => (
                        <div key={app.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                          <span>Candidatura #{history.length - index}</span>
                          <span className="text-muted-foreground">
                            {formatDate(app.applied_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Abandonment Info */}
        {provider.status === 'abandonado' && provider.abandonment_notes && (
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-lg text-red-600 dark:text-red-400">
                Notas de Abandono
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{provider.abandonment_notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
