import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getOnboardingCard,
  getUsers,
  getProviderNotes,
  getProviderHistory,
} from '@/lib/onboarding/actions'
import { formatDateTime } from '@/lib/utils'
import { OnboardingTaskList } from '@/components/onboarding/onboarding-task-list'
import { OnboardingActions } from '@/components/onboarding/onboarding-actions'
import { NotesSection } from '@/components/onboarding/notes-section'
import { HistorySection } from '@/components/onboarding/history-section'
import {
  ArrowLeft,
  Building2,
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
} from 'lucide-react'

interface OnboardingDetailPageProps {
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

export default async function OnboardingDetailPage({ params }: OnboardingDetailPageProps) {
  const { id } = await params

  const [card, users] = await Promise.all([
    getOnboardingCard(id),
    getUsers(),
  ])

  if (!card) {
    notFound()
  }

  // Fetch notes and history in parallel
  const [notes, history] = await Promise.all([
    getProviderNotes(card.provider?.id || ''),
    getProviderHistory(card.provider?.id || ''),
  ])

  const EntityIcon = entityTypeIcons[card.provider?.entity_type || 'tecnico'] || User

  // Calculate task stats
  const tasks = card.tasks || []
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

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Detalhes do Onboarding"
        description={card.provider?.name}
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Back button */}
        <div className="flex items-center justify-between">
          <Link href="/onboarding">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>

          <OnboardingActions
            cardId={card.id}
            ownerId={card.owner?.id}
            ownerName={card.owner?.name || card.owner?.email}
            users={users}
            canComplete={completedTasks === totalTasks && totalTasks > 0}
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
                  <h2 className="text-2xl font-bold">{card.provider?.name}</h2>
                  <Badge variant={card.onboarding_type === 'urgente' ? 'warning' : 'secondary'}>
                    {card.onboarding_type === 'urgente' ? 'Urgente' : 'Normal'}
                  </Badge>
                  {overdueTasks.length > 0 && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {overdueTasks.length} atrasada{overdueTasks.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                <p className="text-muted-foreground mb-4">
                  {entityTypeLabels[card.provider?.entity_type || 'tecnico']}
                  {card.provider?.nif && ` • NIF: ${card.provider.nif}`}
                </p>

                {/* Contact Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${card.provider?.email}`} className="text-primary hover:underline">
                      {card.provider?.email}
                    </a>
                  </div>

                  {card.provider?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${card.provider.phone}`} className="hover:underline">
                        {card.provider.phone}
                      </a>
                    </div>
                  )}

                  {card.provider?.districts && card.provider.districts.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{card.provider.districts.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progresso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Conclusao</span>
                  <span className="font-bold text-lg">{progress}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      overdueTasks.length > 0 ? 'bg-red-500' : 'bg-primary'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Task counts */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-lg font-bold">{completedTasks}</p>
                  <p className="text-xs text-muted-foreground">Concluidas</p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-bold">{inProgressTasks}</p>
                  <p className="text-xs text-muted-foreground">Em curso</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Circle className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{pendingTasks}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>

              {/* Dates */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Etapa atual</span>
                  <Badge variant="outline">
                    {card.current_stage?.stage_number} - {card.current_stage?.name}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Responsavel</span>
                  <span className="font-medium">{card.owner?.name || 'Nao atribuido'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Inicio</span>
                  <span>{formatDateTime(card.started_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <OnboardingTaskList
                tasks={tasks}
                cardId={card.id}
                currentStageId={card.current_stage?.id}
              />
            </CardContent>
          </Card>
        </div>

        {/* Notes and History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <NotesSection
                providerId={card.provider?.id || ''}
                notes={notes}
              />
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historico</CardTitle>
            </CardHeader>
            <CardContent>
              <HistorySection history={history} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
