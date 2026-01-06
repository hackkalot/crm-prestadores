'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Wrench,
  Users,
  Truck,
  Clock,
  CreditCard,
  FileCheck,
  Globe,
} from 'lucide-react'

interface PerfilTabProps {
  provider: {
    id: string
    name: string
    email: string
    phone?: string | null
    entity_type: string
    nif?: string | null
    website?: string | null
    districts?: string[] | null
    services?: string[] | null
    num_technicians?: number | null
    has_admin_team?: boolean | null
    has_own_transport?: boolean | null
    working_hours?: string | null
    iban?: string | null
    activity_proof_url?: string | null
  }
  users: Array<{ id: string; name: string; email: string }>
}

const entityTypeLabels: Record<string, string> = {
  tecnico: 'Técnico',
  eni: 'ENI',
  empresa: 'Empresa',
}

export function PerfilTab({ provider }: PerfilTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Dados Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Entidade</p>
              <p className="font-medium">{entityTypeLabels[provider.entity_type]}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">NIF</p>
              <p className="font-medium">{provider.nif || '-'}</p>
            </div>
            {provider.website && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Website</p>
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <Globe className="h-4 w-4" />
                  {provider.website}
                </a>
              </div>
            )}
            {(provider.entity_type === 'empresa' || provider.entity_type === 'eni') && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Nr de técnicos</p>
                  <p className="font-medium flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {provider.num_technicians || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Equipa Administrativa</p>
                  <p className="font-medium">
                    {provider.has_admin_team ? 'Sim' : 'Não'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transporte Próprio</p>
                  <p className="font-medium flex items-center gap-1">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    {provider.has_own_transport ? 'Sim' : 'Não'}
                  </p>
                </div>
              </>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Horário Laboral</p>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {provider.working_hours || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados Administrativos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Administrativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">IBAN</p>
            <p className="font-medium flex items-center gap-1">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              {provider.iban || '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Comprovativo de Atividade</p>
            {provider.activity_proof_url ? (
              <a
                href={provider.activity_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline flex items-center gap-1"
              >
                <FileCheck className="h-4 w-4" />
                Ver documento
              </a>
            ) : (
              <p className="font-medium text-muted-foreground">-</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Zonas de Atuação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Zonas de Atuação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {provider.districts && provider.districts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {provider.districts.map((district) => (
                <Badge key={district} variant="outline">
                  {district}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhuma zona definida</p>
          )}
        </CardContent>
      </Card>

      {/* Serviços */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          {provider.services && provider.services.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {provider.services.map((service) => (
                <Badge key={service} variant="secondary">
                  {service}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum serviço definido</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
