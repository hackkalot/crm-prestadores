import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getPrestadorById,
  getPrestadorNotes,
  getPrestadorHistory,
  getUsers,
} from '@/lib/prestadores/actions'
import { getProviderPricingTable } from '@/lib/pricing/actions'
import { getSettings } from '@/lib/settings/actions'
import { formatDate, formatDateTime } from '@/lib/utils'
import { PrestadorActions } from '@/components/prestadores/prestador-actions'
import { PrestadorNotesSection } from '@/components/prestadores/prestador-notes-section'
import { PrestadorHistorySection } from '@/components/prestadores/prestador-history-section'
import { PricingTable } from '@/components/prestadores/pricing-table'
import {
  ArrowLeft,
  Building2,
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Clock,
  Truck,
  Users,
  FileCheck,
  CreditCard,
} from 'lucide-react'

interface PrestadorDetailPageProps {
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

const statusLabels: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
}

export default async function PrestadorDetailPage({ params }: PrestadorDetailPageProps) {
  const { id } = await params

  const [prestador, users] = await Promise.all([
    getPrestadorById(id),
    getUsers(),
  ])

  if (!prestador) {
    notFound()
  }

  // Fetch notes, history, pricing table and settings in parallel
  const [notes, history, pricingTable, settings] = await Promise.all([
    getPrestadorNotes(id),
    getPrestadorHistory(id),
    getProviderPricingTable(id),
    getSettings(),
  ])

  // Get deviation threshold from settings
  const deviationThreshold = (settings.find(s => s.key === 'price_deviation_threshold')?.value as number) || 0.20

  const EntityIcon = entityTypeIcons[prestador.entity_type || 'tecnico'] || User

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Ficha do Prestador"
        description={prestador.name}
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Back button */}
        <div className="flex items-center justify-between">
          <Link href="/prestadores">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>

          <PrestadorActions
            prestadorId={prestador.id}
            currentStatus={prestador.status}
            currentOwnerId={prestador.relationship_owner_id}
            users={users}
          />
        </div>

        {/* Main Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <EntityIcon className="h-10 w-10 text-muted-foreground" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{prestador.name}</h2>
                  <Badge
                    variant={prestador.status === 'ativo' ? 'success' : 'warning'}
                  >
                    {statusLabels[prestador.status] || prestador.status}
                  </Badge>
                </div>

                <p className="text-muted-foreground mb-4">
                  {entityTypeLabels[prestador.entity_type || 'tecnico']}
                  {prestador.nif && ` • NIF: ${prestador.nif}`}
                </p>

                {/* Contact Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${prestador.email}`} className="text-primary hover:underline">
                      {prestador.email}
                    </a>
                  </div>

                  {prestador.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${prestador.phone}`} className="hover:underline">
                        {prestador.phone}
                      </a>
                    </div>
                  )}

                  {prestador.districts && prestador.districts.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{prestador.districts.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="resumo" className="space-y-4">
          <TabsList>
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="servicos">Servicos</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
            <TabsTrigger value="historico">Historico</TabsTrigger>
          </TabsList>

          {/* Tab: Resumo */}
          <TabsContent value="resumo" className="space-y-6">
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
                      <p className="font-medium">{entityTypeLabels[prestador.entity_type]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">NIF</p>
                      <p className="font-medium">{prestador.nif || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nr de Tecnicos</p>
                      <p className="font-medium flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {prestador.num_technicians || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Equipa Administrativa</p>
                      <p className="font-medium">
                        {prestador.has_admin_team ? 'Sim' : 'Nao'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transporte Proprio</p>
                      <p className="font-medium flex items-center gap-1">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        {prestador.has_own_transport ? 'Sim' : 'Nao'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Horario Laboral</p>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {prestador.working_hours || '-'}
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
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">IBAN</p>
                      <p className="font-medium flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        {prestador.iban || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Comprovativo de Atividade</p>
                      {prestador.activity_proof_url ? (
                        <a
                          href={prestador.activity_proof_url}
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
                  </div>
                </CardContent>
              </Card>

              {/* Zonas de Atuacao */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Zonas de Atuacao</CardTitle>
                </CardHeader>
                <CardContent>
                  {prestador.districts && prestador.districts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {prestador.districts.map((district: string) => (
                        <Badge key={district} variant="outline">
                          <MapPin className="h-3 w-3 mr-1" />
                          {district}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhuma zona definida</p>
                  )}
                </CardContent>
              </Card>

              {/* Datas Importantes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Datas Importantes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Primeira Candidatura
                    </span>
                    <span className="font-medium">
                      {prestador.first_application_at
                        ? formatDate(prestador.first_application_at)
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Inicio Onboarding
                    </span>
                    <span className="font-medium">
                      {prestador.onboarding_started_at
                        ? formatDate(prestador.onboarding_started_at)
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Entrada na Rede
                    </span>
                    <span className="font-medium">
                      {prestador.activated_at
                        ? formatDate(prestador.activated_at)
                        : '-'}
                    </span>
                  </div>
                  {prestador.suspended_at && (
                    <div className="flex items-center justify-between text-orange-600">
                      <span className="text-sm flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Suspenso em
                      </span>
                      <span className="font-medium">
                        {formatDate(prestador.suspended_at)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      Responsavel da Relacao
                    </span>
                    <span className="font-medium">
                      {prestador.relationship_owner?.name || 'Nao atribuido'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Servicos */}
          <TabsContent value="servicos" className="space-y-6">
            {/* Servicos Gerais */}
            {prestador.services && prestador.services.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Servicos Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {prestador.services.map((service: string) => (
                      <Badge key={service} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabela de Precos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tabela de Precos</CardTitle>
              </CardHeader>
              <CardContent>
                <PricingTable
                  providerId={prestador.id}
                  providerName={prestador.name}
                  data={pricingTable}
                  deviationThreshold={deviationThreshold}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Notas */}
          <TabsContent value="notas">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <PrestadorNotesSection
                  providerId={prestador.id}
                  notes={notes}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Historico */}
          <TabsContent value="histórico">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <PrestadorHistorySection history={history} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
