'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Tipos
export type TaskDefinitionWithStage = {
  id: string
  task_number: number
  name: string
  description: string | null
  default_deadline_hours_normal: number | null
  default_deadline_hours_urgent: number | null
  alert_hours_before: number
  display_order: number
  is_active: boolean
  stage: {
    id: string
    stage_number: string
    name: string
  }
  default_owner: {
    id: string
    name: string
    email: string
  } | null
}

export type Setting = {
  id: string
  key: string
  value: unknown
  description: string | null
  updated_at: string
}

export type SettingsLog = {
  id: string
  setting_key: string
  old_value: unknown
  new_value: unknown
  changed_by: { name: string; email: string } | null
  changed_at: string
}

// Obter todas as definicoes de tarefas com etapas
export async function getTaskDefinitions(): Promise<TaskDefinitionWithStage[]> {
  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from('task_definitions')
    .select(`
      id,
      task_number,
      name,
      description,
      default_deadline_hours_normal,
      default_deadline_hours_urgent,
      alert_hours_before,
      display_order,
      is_active,
      stage:stage_definitions(id, stage_number, name),
      default_owner:users(id, name, email)
    `)
    .order('display_order')

  if (error) {
    console.error('Error fetching task definitions:', error)
    return []
  }

  // Processar relacoes
  return (data || []).map((task: Record<string, unknown>) => ({
    ...task,
    stage: Array.isArray(task.stage) ? task.stage[0] : task.stage,
    default_owner: Array.isArray(task.default_owner) ? task.default_owner[0] : task.default_owner,
  })) as TaskDefinitionWithStage[]
}

// Obter etapas
export async function getStageDefinitions() {
  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from('stage_definitions')
    .select('id, stage_number, name, display_order, is_active')
    .order('display_order')

  if (error) {
    console.error('Error fetching stage definitions:', error)
    return []
  }

  return data || []
}

// Obter utilizadores para selecao de owners (apenas Relationship Managers)
export async function getUsers() {
  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email')
    .eq('role', 'relationship_manager')
    .eq('approval_status', 'approved')
    .order('name')

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return data || []
}

// Obter configuracoes globais
export async function getSettings(): Promise<Setting[]> {
  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('id, key, value, description, updated_at')
    .order('key')

  if (error) {
    console.error('Error fetching settings:', error)
    return []
  }

  return data || []
}

// Obter log de alteracoes de configuracoes
export async function getSettingsLog(): Promise<SettingsLog[]> {
  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from('settings_log')
    .select(`
      id,
      setting_key,
      old_value,
      new_value,
      changed_by:users(name, email),
      changed_at
    `)
    .order('changed_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching settings log:', error)
    return []
  }

  return (data || []).map((log: Record<string, unknown>) => ({
    ...log,
    changed_by: Array.isArray(log.changed_by) ? log.changed_by[0] : log.changed_by,
  })) as SettingsLog[]
}

// Atualizar definicao de tarefa
export async function updateTaskDefinition(
  taskId: string,
  updates: {
    name?: string
    description?: string | null
    default_deadline_hours_normal?: number | null
    default_deadline_hours_urgent?: number | null
    alert_hours_before?: number
    default_owner_id?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin
    .from('task_definitions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (error) {
    console.error('Error updating task definition:', error)
    throw new Error('Failed to update task definition')
  }

  revalidatePath('/configuracoes')
  return { success: true }
}

// Atualizar configuracao global
export async function updateSetting(key: string, value: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const supabaseAdmin = createAdminClient()

  // Obter valor anterior
  const { data: currentSetting } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', key)
    .single()

  // Atualizar ou inserir
  const { error: updateError } = await supabaseAdmin
    .from('settings')
    .upsert({
      key,
      value,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })

  if (updateError) {
    console.error('Error updating setting:', updateError)
    throw new Error('Failed to update setting')
  }

  // Registar no log
  const { error: logError } = await supabaseAdmin
    .from('settings_log')
    .insert({
      setting_key: key,
      old_value: currentSetting?.value ?? null,
      new_value: value,
      changed_by: user.id,
      changed_at: new Date().toISOString(),
    })

  if (logError) {
    console.error('Error logging setting change:', logError)
  }

  revalidatePath('/configuracoes')
  return { success: true }
}

// Obter configuracoes de alertas para o Kanban
export async function getAlertConfig(): Promise<{
  hoursBeforeDeadline: number
  stalledDays: number
}> {
  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .in('key', ['alert_hours_before_deadline', 'stalled_task_days'])

  if (error) {
    console.error('Error fetching alert config:', error)
    return { hoursBeforeDeadline: 24, stalledDays: 3 }
  }

  const settings = data || []
  const hoursBeforeDeadline = settings.find((s: { key: string; value: unknown }) => s.key === 'alert_hours_before_deadline')?.value as number || 24
  const stalledDays = settings.find((s: { key: string; value: unknown }) => s.key === 'stalled_task_days')?.value as number || 3

  return { hoursBeforeDeadline, stalledDays }
}

// Obter ou criar configuracoes padrao
export async function ensureDefaultSettings() {
  const supabaseAdmin = createAdminClient()
  const defaultSettings = [
    { key: 'default_new_provider_owner_id', value: null, description: 'RM atribuído automaticamente ao criar prestador' },
    { key: 'default_onboarding_owner_id', value: null, description: 'RM atribuído automaticamente ao enviar para onboarding' },
    { key: 'alert_hours_before_deadline', value: 24, description: 'Horas antes do prazo para gerar alerta' },
    { key: 'stalled_task_days', value: 3, description: 'Dias sem alterações para considerar tarefa parada' },
    { key: 'price_deviation_threshold', value: 0.20, description: 'Threshold de desvio de preços (20%)' },
  ]

  for (const setting of defaultSettings) {
    const { data: existing } = await supabaseAdmin
      .from('settings')
      .select('id')
      .eq('key', setting.key)
      .single()

    if (!existing) {
      await supabaseAdmin.from('settings').insert(setting)
    }
  }
}
