import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getProviderComplete, getUsers } from '@/lib/providers/actions'
import { formatDateTime } from '@/lib/utils'
import {
  ArrowLeft,
  Building2,
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  Lock,
  XCircle,
} from 'lucide-react'

// Tab components
import { PerfilTab } from '@/components/providers/tabs/perfil-tab'
import { CandidaturaTab } from '@/components/providers/tabs/candidatura-tab'
import { OnboardingTab } from '@/components/providers/tabs/onboarding-tab'
import { PrecosTab } from '@/components/providers/tabs/precos-tab'
import { NotasTab } from '@/components/providers/tabs/notas-tab'
import { HistoricoTab } from '@/components/providers/tabs/historico-tab'
import { CandidaturaActions } from '@/components/providers/candidatura-actions'
import { OnboardingActions } from '@/components/providers/onboarding-actions'

interface ProviderPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

const entityTypeLabels: Record<string, string> = {
  tecnico: 'Técnico',
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

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'> = {
  novo: 'info',
  em_onboarding: 'warning',
  ativo: 'success',
  suspenso: 'destructive',
  abandonado: 'secondary',
}

export default async function ProviderPage({ params, searchParams }: ProviderPageProps) {
  const { id } = await params
  const { tab } = await searchParams

  const [data, users] = await Promise.all([
    getProviderComplete(id),
    getUsers(),
  ])

  if (!data) {
    notFound()
  }

  const { provider, applicationHistory, onboardingCard, notes, history, pricingTable, documents } = data

  const EntityIcon = entityTypeIcons[provider.entity_type] || User

  // Determinar tabs disponíveis
  const hasOnboarding = ['em_onboarding', 'ativo', 'suspenso'].includes(provider.status) || onboardingCard
  const hasPrices = ['ativo', 'suspenso'].includes(provider.status)

  // Calcular stats do onboarding (se existir)
  const tasks = onboardingCard?.tasks || []
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t: { status: string }) => t.status === 'concluida').length
  const inProgressTasks = tasks.filter((t: { status: string }) => t.status === 'em_curso').length
  const pendingTasks = totalTasks - completedTasks - inProgressTasks
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Check for overdue tasks
  const now = new Date()
  const overdueTasks = tasks.filter(
    (t: { status: string; deadline_at: string | null }) =>
      t.status !== 'concluida' && t.deadline_at && new Date(t.deadline_at) < now
  )

  // Determinar tab default
  const defaultTab = tab || (provider.status === 'em_onboarding' ? 'onboarding' : 'perfil')

  // Determinar back URL baseado no status
  const backUrl = provider.status === 'em_onboarding'
    ? '/onboarding'
    : ['ativo', 'suspenso'].includes(provider.status)
      ? '/prestadores'
      : '/candidaturas'

  return (
    <div className="flex flex-col h-full">
      <Header
        title={provider.name}
        description={entityTypeLabels[provider.entity_type]}
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Back button */}
        <div className="flex items-center justify-between">
          <Link href={backUrl}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>

        {/* Banner Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Left: Provider Info */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                  <EntityIcon className="h-8 w-8 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold truncate">{provider.name}</h2>
                    <Badge variant={statusVariants[provider.status]}>
                      {statusLabels[provider.status]}
                    </Badge>
                    {onboardingCard?.onboarding_type === 'urgente' && (
                      <Badge variant="warning">Urgente</Badge>
                    )}
                    {overdueTasks.length > 0 && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {overdueTasks.length} atrasada{overdueTasks.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {entityTypeLabels[provider.entity_type]}
                    {provider.nif && ` • NIF: ${provider.nif}`}
                  </p>

                  {/* Contact Info */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <a href={`mailto:${provider.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                      <Mail className="h-4 w-4" />
                      {provider.email}
                    </a>
                    {provider.phone && (
                      <a href={`tel:${provider.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                        <Phone className="h-4 w-4" />
                        {provider.phone}
                      </a>
                    )}
                    {provider.districts && provider.districts.length > 0 && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {provider.districts.slice(0, 3).join(', ')}
                        {provider.districts.length > 3 && ` +${provider.districts.length - 3}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions for novo/abandonado */}
              {['novo', 'abandonado'].includes(provider.status) && (
                <div className="flex items-center lg:border-l lg:pl-6">
                  <CandidaturaActions providerId={provider.id} status={provider.status} />
                </div>
              )}

              {/* Right: Progress Stats (só se em onboarding) */}
              {provider.status === 'em_onboarding' && onboardingCard && (
                <div className="flex flex-col gap-4 lg:border-l lg:pl-6">
                  <div className="flex items-center gap-6">
                    {/* Progress Ring */}
                    <div className="relative h-20 w-20 shrink-0">
                      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-muted"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray={`${progress}, 100`}
                          className={overdueTasks.length > 0 ? 'text-red-500' : 'text-primary'}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold">{progress}%</span>
                      </div>
                    </div>

                    {/* Task Counts */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-950 mx-auto mb-1">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-lg font-bold">{completedTasks}</p>
                        <p className="text-[10px] text-muted-foreground">Feitas</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 mx-auto mb-1">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <p className="text-lg font-bold">{inProgressTasks}</p>
                        <p className="text-[10px] text-muted-foreground">Em curso</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted mx-auto mb-1">
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-bold">{pendingTasks}</p>
                        <p className="text-[10px] text-muted-foreground">Pendentes</p>
                      </div>
                    </div>
                  </div>
                  <OnboardingActions providerId={provider.id} providerName={provider.name} />
                </div>
              )}

              {/* Right: Status info for ativo/suspenso */}
              {['ativo', 'suspenso'].includes(provider.status) && (
                <div className="flex items-center gap-4 lg:border-l lg:pl-6">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                    provider.status === 'ativo'
                      ? 'bg-green-100 dark:bg-green-950'
                      : 'bg-red-100 dark:bg-red-950'
                  }`}>
                    {provider.status === 'ativo' ? (
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {provider.status === 'ativo' ? 'Ativo desde' : 'Suspenso desde'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(provider.status === 'ativo' ? provider.activated_at : provider.suspended_at)}
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Meta Info Bar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-4 border-t text-sm">
              {onboardingCard && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Etapa:</span>
                  <Badge variant="outline">
                    {onboardingCard.current_stage?.stage_number} - {onboardingCard.current_stage?.name}
                  </Badge>
                </div>
              )}
              {(onboardingCard?.owner || provider.relationship_owner) && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Responsável:</span>
                  <span className="font-medium">
                    {onboardingCard?.owner?.name || provider.relationship_owner?.name || 'Não atribuído'}
                  </span>
                </div>
              )}
              {provider.first_application_at && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">1ª Candidatura:</span>
                  <span>{formatDateTime(provider.first_application_at)}</span>
                </div>
              )}
              {provider.application_count > 1 && (
                <Badge variant="outline">{provider.application_count}x candidaturas</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="candidatura">Candidatura</TabsTrigger>
            <TabsTrigger value="onboarding" disabled={!hasOnboarding}>
              Onboarding
              {hasOnboarding && totalTasks > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {completedTasks}/{totalTasks}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="precos" disabled={!hasPrices}>
              Preços
            </TabsTrigger>
            <TabsTrigger value="notas">
              Notas
              {notes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {notes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <PerfilTab provider={provider} users={users} />
          </TabsContent>

          <TabsContent value="candidatura">
            <CandidaturaTab
              provider={provider}
              applicationHistory={applicationHistory}
            />
          </TabsContent>

          <TabsContent value="onboarding">
            {hasOnboarding && onboardingCard ? (
              <OnboardingTab
                provider={provider}
                onboardingCard={onboardingCard}
                users={users}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>O onboarding ainda não foi iniciado.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="precos">
            <PrecosTab
              provider={provider}
              pricingTable={pricingTable}
            />
          </TabsContent>

          <TabsContent value="notas">
            <NotasTab
              providerId={provider.id}
              notes={notes}
              documents={documents}
            />
          </TabsContent>

          <TabsContent value="historico">
            <HistoricoTab history={history} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
