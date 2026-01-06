'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Funcao auxiliar para obter o ID do utilizador na tabela users
async function getUserId(authUser: { id: string; email?: string }): Promise<string | null> {
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

export type Alert = {
  id: string
  provider_id: string | null
  task_id: string | null
  user_id: string
  alert_type: string
  title: string
  message: string | null
  is_read: boolean
  read_at: string | null
  trigger_at: string
  created_at: string
  provider?: { name: string } | null
  task?: {
    card_id: string
    task_definition: { name: string } | null
  } | null
}

// Obter alertas do utilizador atual
export async function getUserAlerts(unreadOnly = false): Promise<Alert[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Obter ID do utilizador na tabela users
  const userId = await getUserId(user)
  if (!userId) return []

  let query = supabaseAdmin
    .from('alerts')
    .select(`
      *,
      provider:providers(name),
      task:onboarding_tasks(
        card_id,
        task_definition:task_definitions(name)
      )
    `)
    .eq('user_id', userId)
    .lte('trigger_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching alerts:', error)
    return []
  }

  // Processar relacoes
  return (data || []).map(alert => ({
    ...alert,
    provider: Array.isArray(alert.provider) ? alert.provider[0] : alert.provider,
    task: Array.isArray(alert.task) ? alert.task[0] : alert.task,
  }))
}

// Contar alertas nao lidos
export async function getUnreadAlertCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  // Obter ID do utilizador na tabela users
  const userId = await getUserId(user)
  if (!userId) return 0

  const { count, error } = await supabaseAdmin
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .lte('trigger_at', new Date().toISOString())

  if (error) {
    console.error('Error counting alerts:', error)
    return 0
  }

  return count || 0
}

// Marcar alerta como lido
export async function markAlertAsRead(alertId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Obter ID do utilizador na tabela users
  const userId = await getUserId(user)
  if (!userId) return false

  const { error } = await supabaseAdmin
    .from('alerts')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error marking alert as read:', error)
    return false
  }

  revalidatePath('/')
  return true
}

// Marcar todos os alertas como lidos
export async function markAllAlertsAsRead(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Obter ID do utilizador na tabela users
  const userId = await getUserId(user)
  if (!userId) return false

  const { error } = await supabaseAdmin
    .from('alerts')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking all alerts as read:', error)
    return false
  }

  revalidatePath('/')
  return true
}

// Gerar alertas de prazo a expirar
// Esta funcao deve ser chamada periodicamente (cron job ou similar)
export async function generateDeadlineAlerts(): Promise<number> {
  // Obter configuracao de horas antes do prazo
  const { data: setting } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'alert_hours_before_deadline')
    .single()

  const hoursBeforeDeadline = (setting?.value as number) || 24
  const alertThreshold = new Date(Date.now() + hoursBeforeDeadline * 60 * 60 * 1000)

  // Buscar tarefas com prazo proximo e que ainda nao tem alerta
  const { data: tasks, error } = await supabaseAdmin
    .from('onboarding_tasks')
    .select(`
      id,
      deadline_at,
      owner_id,
      card_id,
      task_definition:task_definitions(name),
      onboarding_card:onboarding_cards(
        provider_id,
        provider:providers(name)
      )
    `)
    .neq('status', 'concluida')
    .not('deadline_at', 'is', null)
    .lte('deadline_at', alertThreshold.toISOString())
    .gt('deadline_at', new Date().toISOString())

  if (error || !tasks) {
    console.error('Error fetching tasks for alerts:', error)
    return 0
  }

  let alertsCreated = 0

  for (const task of tasks) {
    if (!task.owner_id) continue

    // Verificar se ja existe alerta para esta tarefa
    const { data: existingAlert } = await supabaseAdmin
      .from('alerts')
      .select('id')
      .eq('task_id', task.id)
      .eq('alert_type', 'deadline_approaching')
      .single()

    if (existingAlert) continue

    // Extrair dados das relacoes
    const taskDef = Array.isArray(task.task_definition)
      ? task.task_definition[0]
      : task.task_definition
    const card = Array.isArray(task.onboarding_card)
      ? task.onboarding_card[0]
      : task.onboarding_card
    const provider = card?.provider
      ? (Array.isArray(card.provider) ? card.provider[0] : card.provider)
      : null

    // Criar alerta
    const { error: insertError } = await supabaseAdmin
      .from('alerts')
      .insert({
        provider_id: card?.provider_id,
        task_id: task.id,
        user_id: task.owner_id,
        alert_type: 'deadline_approaching',
        title: 'Prazo a expirar',
        message: `A tarefa "${taskDef?.name || 'Tarefa'}" do prestador "${provider?.name || 'Desconhecido'}" expira em breve.`,
        trigger_at: new Date().toISOString(),
      })

    if (!insertError) {
      alertsCreated++
    }
  }

  return alertsCreated
}

// Gerar alertas de tarefa parada
export async function generateStalledTaskAlerts(): Promise<number> {
  // Obter configuracao de dias sem alteracoes
  const { data: setting } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'stalled_task_days')
    .single()

  const stalledDays = (setting?.value as number) || 3
  const stalledThreshold = new Date(Date.now() - stalledDays * 24 * 60 * 60 * 1000)

  // Buscar tarefas sem alteracoes ha mais de X dias
  const { data: tasks, error } = await supabaseAdmin
    .from('onboarding_tasks')
    .select(`
      id,
      owner_id,
      updated_at,
      card_id,
      task_definition:task_definitions(name),
      onboarding_card:onboarding_cards(
        provider_id,
        provider:providers(name)
      )
    `)
    .neq('status', 'concluida')
    .lt('updated_at', stalledThreshold.toISOString())

  if (error || !tasks) {
    console.error('Error fetching stalled tasks:', error)
    return 0
  }

  let alertsCreated = 0

  for (const task of tasks) {
    if (!task.owner_id) continue

    // Verificar se ja existe alerta recente para esta tarefa
    const recentAlertThreshold = new Date(Date.now() - stalledDays * 24 * 60 * 60 * 1000)
    const { data: existingAlert } = await supabaseAdmin
      .from('alerts')
      .select('id')
      .eq('task_id', task.id)
      .eq('alert_type', 'task_stalled')
      .gte('created_at', recentAlertThreshold.toISOString())
      .single()

    if (existingAlert) continue

    // Extrair dados das relacoes
    const taskDef = Array.isArray(task.task_definition)
      ? task.task_definition[0]
      : task.task_definition
    const card = Array.isArray(task.onboarding_card)
      ? task.onboarding_card[0]
      : task.onboarding_card
    const provider = card?.provider
      ? (Array.isArray(card.provider) ? card.provider[0] : card.provider)
      : null

    // Criar alerta
    const { error: insertError } = await supabaseAdmin
      .from('alerts')
      .insert({
        provider_id: card?.provider_id,
        task_id: task.id,
        user_id: task.owner_id,
        alert_type: 'task_stalled',
        title: 'Tarefa parada',
        message: `A tarefa "${taskDef?.name || 'Tarefa'}" do prestador "${provider?.name || 'Desconhecido'}" nao tem alteracoes ha ${stalledDays} dias.`,
        trigger_at: new Date().toISOString(),
      })

    if (!insertError) {
      alertsCreated++
    }
  }

  return alertsCreated
}

// Verificar se um card tem tarefas em risco
export async function checkCardRiskStatus(cardId: string): Promise<{
  hasOverdue: boolean
  hasApproachingDeadline: boolean
  hasStalled: boolean
}> {
  const now = new Date()

  // Obter configuracoes
  const { data: settings } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .in('key', ['alert_hours_before_deadline', 'stalled_task_days'])

  const hoursBeforeDeadline = (settings?.find(s => s.key === 'alert_hours_before_deadline')?.value as number) || 24
  const stalledDays = (settings?.find(s => s.key === 'stalled_task_days')?.value as number) || 3

  const alertThreshold = new Date(Date.now() + hoursBeforeDeadline * 60 * 60 * 1000)
  const stalledThreshold = new Date(Date.now() - stalledDays * 24 * 60 * 60 * 1000)

  // Buscar tarefas do card
  const { data: tasks } = await supabaseAdmin
    .from('onboarding_tasks')
    .select('id, status, deadline_at, updated_at')
    .eq('card_id', cardId)
    .neq('status', 'concluida')

  if (!tasks) {
    return { hasOverdue: false, hasApproachingDeadline: false, hasStalled: false }
  }

  let hasOverdue = false
  let hasApproachingDeadline = false
  let hasStalled = false

  for (const task of tasks) {
    // Verificar atrasadas
    if (task.deadline_at && new Date(task.deadline_at) < now) {
      hasOverdue = true
    }
    // Verificar prazo proximo
    else if (task.deadline_at && new Date(task.deadline_at) <= alertThreshold) {
      hasApproachingDeadline = true
    }
    // Verificar paradas
    if (task.updated_at && new Date(task.updated_at) < stalledThreshold) {
      hasStalled = true
    }
  }

  return { hasOverdue, hasApproachingDeadline, hasStalled }
}
