'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Calendar, FileText, Link as LinkIcon } from 'lucide-react'

interface CandidaturaTabProps {
  provider: {
    id: string
    name: string
    status: string
    first_application_at?: string | null
    created_at: string
    onboarding_started_at?: string | null
    activated_at?: string | null
    abandoned_at?: string | null
    abandonment_reason?: string | null
    abandonment_party?: string | null
    abandonment_notes?: string | null
    application_source?: string | null
  }
  applicationHistory: Array<{
    id: string
    applied_at: string
    source?: string | null
  }>
}

export function CandidaturaTab({ provider, applicationHistory }: CandidaturaTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                  <p className="text-sm font-medium">Início do onboarding</p>
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
                  <p className="text-sm font-medium">Ativação</p>
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
                  {provider.abandonment_party && (
                    <p className="text-xs text-muted-foreground">
                      {provider.abandonment_party === 'prestador' ? 'Pelo prestador' : 'Pela FIXO'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Candidaturas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Candidaturas ({applicationHistory.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applicationHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem histórico de candidaturas.</p>
          ) : (
            <div className="space-y-2">
              {applicationHistory.map((app, index) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                >
                  <span>Candidatura #{applicationHistory.length - index}</span>
                  <div className="flex items-center gap-2">
                    {app.source && (
                      <Badge variant="outline" className="text-xs">
                        <LinkIcon className="h-3 w-3 mr-1" />
                        {app.source}
                      </Badge>
                    )}
                    <span className="text-muted-foreground">
                      {formatDate(app.applied_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notas de Abandono */}
      {provider.status === 'abandonado' && provider.abandonment_notes && (
        <Card className="lg:col-span-2 border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-lg text-red-600 dark:text-red-400">
              Notas de Abandono
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{provider.abandonment_notes}</p>
            {provider.abandonment_reason && (
              <p className="text-sm text-muted-foreground mt-2">
                Motivo: {provider.abandonment_reason}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
