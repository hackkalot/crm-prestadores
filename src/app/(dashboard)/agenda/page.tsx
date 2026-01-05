import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { AgendaFilters } from '@/components/agenda/agenda-filters'
import { AgendaStats } from '@/components/agenda/agenda-stats'
import { AgendaWeekView } from '@/components/agenda/agenda-week-view'
import { AgendaDayView } from '@/components/agenda/agenda-day-view'
import {
  getAgendaTasks,
  getAgendaStats,
  getWeekTasks,
  type AgendaView
} from '@/lib/agenda/actions'
import { format } from 'date-fns'

interface AgendaPageProps {
  searchParams: Promise<{
    view?: string
    date?: string
  }>
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const params = await searchParams

  const currentView = (params.view as AgendaView) || 'week'
  const currentDate = params.date || format(new Date(), 'yyyy-MM-dd')

  const filters = {
    view: currentView,
    date: currentDate,
    showCompleted: false,
  }

  const [stats, weekTasks, dayTasks] = await Promise.all([
    getAgendaStats(),
    currentView === 'week' ? getWeekTasks(filters) : Promise.resolve({}),
    currentView === 'day' ? getAgendaTasks(filters) : Promise.resolve([]),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Agenda"
        description="Gerir tarefas e prazos de onboarding"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Estatisticas */}
        <Suspense fallback={<div className="h-24 bg-muted animate-pulse rounded-lg" />}>
          <AgendaStats stats={stats} />
        </Suspense>

        {/* Filtros e navegacao */}
        <Suspense fallback={<div className="h-16 bg-muted animate-pulse rounded-lg" />}>
          <AgendaFilters currentDate={currentDate} currentView={currentView} />
        </Suspense>

        {/* Vista */}
        {currentView === 'week' ? (
          <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
            <AgendaWeekView weekTasks={weekTasks} />
          </Suspense>
        ) : (
          <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
            <AgendaDayView tasks={dayTasks} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
