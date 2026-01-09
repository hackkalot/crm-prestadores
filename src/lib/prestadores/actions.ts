'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type ProviderStatus = Database['public']['Enums']['provider_status']

export type PrestadorFilters = {
  status?: ProviderStatus | 'all' | '_all'
  entityType?: string
  district?: string
  service?: string
  ownerId?: string
  search?: string
}

// Obter prestadores ativos (que ja passaram pelo onboarding)
export async function getPrestadores(filters: PrestadorFilters = {}) {
  let query = createAdminClient()
    .from('providers')
    .select(`
      *,
      relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email)
    `)

  // Handle status filtering - backward compatible
  if (!filters.status || filters.status === '_all') {
    // Default: show ALL statuses (no filter applied)
    // Don't add any status filter
  } else if (filters.status === 'all') {
    // Show active network (ativo + suspenso)
    query = query.in('status', ['ativo', 'suspenso'])
  } else {
    // Specific status selected
    query = query.eq('status', filters.status)
  }

  query = query.order('name')

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters.district) {
    query = query.contains('districts', [filters.district])
  }

  if (filters.service) {
    query = query.contains('services', [filters.service])
  }

  if (filters.ownerId) {
    query = query.eq('relationship_owner_id', filters.ownerId)
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,nif.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar prestadores:', error)
    return []
  }

  return data || []
}

// Obter detalhes de um prestador
export async function getPrestadorById(id: string) {
  const { data, error } = await createAdminClient()
    .from('providers')
    .select(`
      *,
      relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erro ao buscar prestador:', error)
    return null
  }

  return data
}

// Obter notas de um prestador
export async function getPrestadorNotes(providerId: string) {
  const { data, error } = await createAdminClient()
    .from('notes')
    .select(`
      *,
      created_by_user:users!notes_created_by_fkey(id, name)
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar notas:', error)
    return []
  }

  return data || []
}

// Obter historico de um prestador
export async function getPrestadorHistory(providerId: string) {
  const { data, error } = await createAdminClient()
    .from('history_log')
    .select(`
      *,
      created_by_user:users!history_log_created_by_fkey(id, name)
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Erro ao buscar histórico:', error)
    return []
  }

  return data || []
}

// Adicionar nota
export type AddNoteState = {
  error?: string
  success?: boolean
}

export async function addPrestadorNote(
  prevState: AddNoteState,
  formData: FormData
): Promise<AddNoteState> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const content = formData.get('content') as string
  const noteType = formData.get('noteType') as string

  if (!providerId || !content) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const { error } = await createAdminClient()
    .from('notes')
    .insert({
      provider_id: providerId,
      content,
      note_type: noteType || null,
      created_by: user.id,
    })

  if (error) {
    console.error('Erro ao adicionar nota:', error)
    return { error: 'Erro ao adicionar nota' }
  }

  // Registar no historico
  await createAdminClient().from('history_log').insert({
    provider_id: providerId,
    event_type: 'note_added',
    description: 'Nota adicionada',
    new_value: { content: content.substring(0, 100) + (content.length > 100 ? '...' : '') },
    created_by: user.id,
  })

  revalidatePath(`/prestadores/${providerId}`)

  return { success: true }
}

// Atualizar estado do prestador
export type UpdateStatusState = {
  error?: string
  success?: boolean
}

export async function updatePrestadorStatus(
  prevState: UpdateStatusState,
  formData: FormData
): Promise<UpdateStatusState> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const newStatus = formData.get('status') as ProviderStatus
  const reason = formData.get('reason') as string

  if (!providerId || !newStatus) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nao autenticado' }
  }

  // Obter estado atual
  const { data: currentProvider } = await createAdminClient()
    .from('providers')
    .select('status')
    .eq('id', providerId)
    .single()

  if (!currentProvider) {
    return { error: 'Prestador não encontrado' }
  }

  const updateData: Record<string, unknown> = { status: newStatus }

  if (newStatus === 'suspenso') {
    updateData.suspended_at = new Date().toISOString()
  } else if (newStatus === 'ativo' && currentProvider.status === 'suspenso') {
    updateData.suspended_at = null
  }

  const { error } = await createAdminClient()
    .from('providers')
    .update(updateData)
    .eq('id', providerId)

  if (error) {
    console.error('Erro ao atualizar estado:', error)
    return { error: 'Erro ao atualizar estado' }
  }

  // Registar no historico
  await createAdminClient().from('history_log').insert({
    provider_id: providerId,
    event_type: 'status_change',
    description: `Estado alterado para ${newStatus}${reason ? `: ${reason}` : ''}`,
    old_value: { status: currentProvider.status },
    new_value: { status: newStatus },
    reason: reason || null,
    created_by: user.id,
  })

  revalidatePath('/prestadores')
  revalidatePath(`/providers/${providerId}`)

  return { success: true }
}

// Atualizar owner do relacionamento
export async function updateRelationshipOwner(
  prevState: UpdateStatusState,
  formData: FormData
): Promise<UpdateStatusState> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const newOwnerId = formData.get('ownerId') as string

  if (!providerId || !newOwnerId) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  // Obter owner atual
  const { data: currentProvider } = await createAdminClient()
    .from('providers')
    .select('relationship_owner_id')
    .eq('id', providerId)
    .single()

  const { error } = await createAdminClient()
    .from('providers')
    .update({ relationship_owner_id: newOwnerId })
    .eq('id', providerId)

  if (error) {
    console.error('Erro ao atualizar owner:', error)
    return { error: 'Erro ao atualizar responsavel' }
  }

  // Registar no historico
  await createAdminClient().from('history_log').insert({
    provider_id: providerId,
    event_type: 'owner_change',
    description: 'Responsável da relação alterado',
    old_value: { owner_id: currentProvider?.relationship_owner_id },
    new_value: { owner_id: newOwnerId },
    created_by: user.id,
  })

  revalidatePath(`/providers/${providerId}`)

  return { success: true }
}

// Estatisticas
export async function getPrestadoresStats() {
  const { data, error } = await createAdminClient()
    .from('providers')
    .select('status')

  if (error || !data) {
    return {
      novo: 0,
      em_onboarding: 0,
      ativo: 0,
      suspenso: 0,
      abandonado: 0,
      total: 0,
    }
  }

  const result = {
    novo: 0,
    em_onboarding: 0,
    ativo: 0,
    suspenso: 0,
    abandonado: 0,
    total: data.length,
  }

  for (const p of data) {
    if (p.status === 'novo') result.novo++
    else if (p.status === 'em_onboarding') result.em_onboarding++
    else if (p.status === 'ativo') result.ativo++
    else if (p.status === 'suspenso') result.suspenso++
    else if (p.status === 'abandonado') result.abandonado++
  }

  return result
}

// Obter distritos unicos
export async function getDistinctPrestadorDistricts() {
  const { data, error } = await createAdminClient()
    .from('providers')
    .select('districts')
    .in('status', ['ativo', 'suspenso'])
    .not('districts', 'is', null)

  if (error || !data) return []

  const districts = new Set<string>()
  for (const p of data) {
    if (p.districts && Array.isArray(p.districts)) {
      for (const d of p.districts) {
        districts.add(d)
      }
    }
  }

  return Array.from(districts).sort()
}

// Obter servicos unicos
export async function getDistinctPrestadorServices() {
  const { data, error } = await createAdminClient()
    .from('providers')
    .select('services')
    .in('status', ['ativo', 'suspenso'])
    .not('services', 'is', null)

  if (error || !data) return []

  const services = new Set<string>()
  for (const p of data) {
    if (p.services && Array.isArray(p.services)) {
      for (const s of p.services) {
        services.add(s)
      }
    }
  }

  return Array.from(services).sort()
}

// Obter usuarios para select (apenas Relationship Managers)
export async function getUsers() {
  const { data, error } = await createAdminClient()
    .from('users')
    .select('id, name, email')
    .eq('role', 'relationship_manager')
    .eq('approval_status', 'approved')
    .order('name')

  if (error) {
    console.error('Erro ao buscar users:', error)
    return []
  }

  return data || []
}
