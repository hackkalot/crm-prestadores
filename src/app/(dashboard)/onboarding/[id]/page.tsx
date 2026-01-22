import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  ListTodo,
  MessageSquare,
  History,
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
              Voltar ao Kanban
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

        {/* Provider Info Header */}
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
                    <h2 className="text-xl font-bold truncate">{card.provider?.name}</h2>
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

                  <p className="text-sm text-muted-foreground mb-3">
                    {entityTypeLabels[card.provider?.entity_type || 'tecnico']}
                    {card.provider?.nif && ` • NIF: ${card.provider.nif}`}
                  </p>

                  {/* Contact Info */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <a href={`mailto:${card.provider?.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                      <Mail className="h-4 w-4" />
                      {card.provider?.email}
                    </a>
                    {card.provider?.phone && (
                      <a href={`tel:${card.provider.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                        <Phone className="h-4 w-4" />
                        {card.provider.phone}
                      </a>
                    )}
                    {card.provider?.districts && card.provider.districts.length > 0 && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {card.provider.districts.slice(0, 3).join(', ')}
                        {card.provider.districts.length > 3 && ` +${card.provider.districts.length - 3}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Progress Stats */}
              <div className="flex items-center gap-6 lg:border-l lg:pl-6">
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
            </div>

            {/* Meta Info Bar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-4 border-t text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Etapa:</span>
                <Badge variant="outline">
                  {card.current_stage?.stage_number} - {card.current_stage?.name}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Responsável:</span>
                <span className="font-medium">{card.owner?.name || 'Não atribuído'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Início:</span>
                <span>{formatDateTime(card.started_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="tarefas" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="tarefas" className="gap-2">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Tarefas</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {completedTasks}/{totalTasks}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="notas" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Notas</span>
              {notes.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {notes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tarefas" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <OnboardingTaskList
                  tasks={tasks}
                  cardId={card.id}
                  currentStageId={card.current_stage?.id}
                  providerId={card.provider?.id}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notas" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <NotesSection
                  providerId={card.provider?.id || ''}
                  notes={notes}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <HistorySection history={history} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
