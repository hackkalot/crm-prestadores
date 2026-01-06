'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { startOfWeek, endOfWeek, startOfDay, endOfDay, addDays, format } from 'date-fns'

// Criar cliente admin apenas quando necessário (não no nível do módulo para evitar erros de build)
function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type AgendaView = 'week' | 'day'

export type AgendaFilters = {
  view: AgendaView
  date: string // ISO date string
  showCompleted?: boolean
}

export type AgendaTask = {
  id: string
  taskName: string
  status: string
  dueDate: string | null
  providerId: string
  providerName: string
  providerType: string
  stageId: string
  stageName: string
  stageNumber: number
  onboardingType: string
  cardId: string
  isOverdue: boolean
  isUrgent: boolean
}

// Funcao auxiliar para obter o ID do utilizador na tabela users
async function getUserId(authUser: { id: string; email?: string }): Promise<string | null> {
  const supabaseAdmin = getSupabaseAdmin()

  // Primeiro tentar por ID direto
  const { data: userById } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', authUser.id)
    .single()

  if (userById) return userById.id

  // Se nao encontrou, tentar por email
  if (authUser.email) {
    const { data: userByEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', authUser.email)
      .single()

    if (userByEmail) return userByEmail.id
  }

  return null
}

// Obter tarefas do utilizador atual
export async function getAgendaTasks(filters: AgendaFilters): Promise<AgendaTask[]> {
  const supabase = await createClient()

  // Obter utilizador atual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Obter ID do utilizador na tabela users
  const userId = await getUserId(user)
  if (!userId) {
    console.log('User not found in users table:', user.id, user.email)
    return []
  }

  // Determinar range de datas
  const baseDate = new Date(filters.date)
  let startDate: Date
  let endDate: Date

  if (filters.view === 'week') {
    startDate = startOfWeek(baseDate, { weekStartsOn: 1 }) // Comeca segunda
    endDate = endOfWeek(baseDate, { weekStartsOn: 1 })
  } else {
    startDate = startOfDay(baseDate)
    endDate = endOfDay(baseDate)
  }

  // Buscar tarefas do utilizador
  const supabaseAdmin = getSupabaseAdmin()
  let query = supabaseAdmin
    .from('onboarding_tasks')
    .select(`
      id,
      status,
      deadline_at,
      task_definition:task_definitions(
        id,
        name,
        stage:stage_definitions(id, name, stage_number)
      ),
      onboarding_card:onboarding_cards(
        id,
        onboarding_type,
        provider:providers(id, name, entity_type)
      )
    `)
    .eq('owner_id', userId)

  // Filtrar por status
  if (!filters.showCompleted) {
    query = query.neq('status', 'concluida')
  }

  const { data: tasks, error } = await query

  if (error) {
    console.error('Error fetching agenda tasks:', JSON.stringify(error, null, 2))
    return []
  }

  if (!tasks || tasks.length === 0) {
    return []
  }

  // Processar e filtrar tarefas
  const now = new Date()
  const processedTasks: AgendaTask[] = []

  for (const task of tasks) {
    // Extrair dados das relacoes (podem vir como array)
    const taskDef = Array.isArray(task.task_definition)
      ? task.task_definition[0]
      : task.task_definition
    const card = Array.isArray(task.onboarding_card)
      ? task.onboarding_card[0]
      : task.onboarding_card
    const stage = taskDef?.stage
      ? (Array.isArray(taskDef.stage) ? taskDef.stage[0] : taskDef.stage)
      : null
    const provider = card?.provider
      ? (Array.isArray(card.provider) ? card.provider[0] : card.provider)
      : null

    if (!taskDef || !card || !provider || !stage) continue

    const dueDate = task.deadline_at ? new Date(task.deadline_at) : null

    // Para tarefas sem prazo definido, incluir na agenda se estao pendentes
    // Para tarefas com prazo, verificar se estao no range
    const includeTask = !dueDate ||
      (dueDate >= startDate && dueDate <= endDate) ||
      (dueDate < now && task.status !== 'concluida') // Incluir atrasadas

    if (!includeTask) continue

    processedTasks.push({
      id: task.id,
      taskName: taskDef.name,
      status: task.status,
      dueDate: task.deadline_at,
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.entity_type,
      stageId: stage.id,
      stageName: stage.name,
      stageNumber: stage.stage_number,
      onboardingType: card.onboarding_type,
      cardId: card.id,
      isOverdue: dueDate ? dueDate < now && task.status !== 'concluida' : false,
      isUrgent: card.onboarding_type === 'urgente',
    })
  }

  // Ordenar: atrasadas primeiro, depois por data
  processedTasks.sort((a, b) => {
    // Atrasadas primeiro
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1

    // Urgentes primeiro (dentro do mesmo grupo)
    if (a.isUrgent && !b.isUrgent) return -1
    if (!a.isUrgent && b.isUrgent) return 1

    // Por data
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  return processedTasks
}

// Obter estatisticas da agenda
export async function getAgendaStats() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { total: 0, pending: 0, overdue: 0, completedToday: 0 }

  // Obter ID do utilizador na tabela users
  const userId = await getUserId(user)
  if (!userId) return { total: 0, pending: 0, overdue: 0, completedToday: 0 }

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  // Buscar todas as tarefas do utilizador
  const supabaseAdmin = getSupabaseAdmin()
  const { data: tasks } = await supabaseAdmin
    .from('onboarding_tasks')
    .select('id, status, deadline_at, completed_at')
    .eq('owner_id', userId)

  if (!tasks) return { total: 0, pending: 0, overdue: 0, completedToday: 0 }

  const total = tasks.length
  const pending = tasks.filter(t => t.status !== 'concluida').length
  const overdue = tasks.filter(t => {
    if (t.status === 'concluida' || !t.deadline_at) return false
    return new Date(t.deadline_at) < now
  }).length
  const completedToday = tasks.filter(t => {
    if (t.status !== 'concluida' || !t.completed_at) return false
    const completedDate = new Date(t.completed_at)
    return completedDate >= todayStart && completedDate <= todayEnd
  }).length

  return { total, pending, overdue, completedToday }
}

// Obter tarefas agrupadas por dia para vista semanal
export async function getWeekTasks(filters: AgendaFilters): Promise<Record<string, AgendaTask[]>> {
  const tasks = await getAgendaTasks({ ...filters, view: 'week' })

  const baseDate = new Date(filters.date)
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })

  // Inicializar dias da semana
  const weekDays: Record<string, AgendaTask[]> = {}
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i)
    const dayKey = format(day, 'yyyy-MM-dd')
    weekDays[dayKey] = []
  }

  // Adicionar tarefas sem prazo a um grupo especial
  weekDays['no-date'] = []

  // Distribuir tarefas
  for (const task of tasks) {
    if (!task.dueDate) {
      weekDays['no-date'].push(task)
    } else {
      const dayKey = format(new Date(task.dueDate), 'yyyy-MM-dd')
      if (weekDays[dayKey]) {
        weekDays[dayKey].push(task)
      } else {
        // Tarefa atrasada de semana anterior
        weekDays['no-date'].push(task)
      }
    }
  }

  return weekDays
}
