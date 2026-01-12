'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { unstable_cache } from 'next/cache'
import type { Database } from '@/types/database'

type ProviderStatus = Database['public']['Enums']['provider_status']

export type PrestadorFilters = {
  status?: ProviderStatus | 'all' | '_all'
  entityType?: string
  district?: string      // Legacy single filter
  service?: string       // Legacy single filter
  districts?: string[]   // Multi-select filter
  services?: string[]    // Multi-select filter
  ownerId?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedPrestadores {
  data: Awaited<ReturnType<typeof getPrestadoresInternal>>
  total: number
  page: number
  limit: number
  totalPages: number
}

// Helper function to apply filters to a query
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyPrestadorFilters(query: any, filters: PrestadorFilters) {
  // Handle status filtering - backward compatible
  if (!filters.status || filters.status === '_all') {
    // Default: show ALL statuses (no filter applied)
  } else if (filters.status === 'all') {
    // Show active network (ativo + suspenso)
    query = query.in('status', ['ativo', 'suspenso'])
  } else {
    // Specific status selected
    query = query.eq('status', filters.status)
  }

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  // Multi-select district filter (new)
  if (filters.districts && filters.districts.length > 0) {
    query = query.overlaps('districts', filters.districts)
  } else if (filters.district) {
    query = query.contains('districts', [filters.district])
  }

  // Multi-select service filter (new)
  if (filters.services && filters.services.length > 0) {
    query = query.overlaps('services', filters.services)
  } else if (filters.service) {
    query = query.contains('services', [filters.service])
  }

  if (filters.ownerId) {
    query = query.eq('relationship_owner_id', filters.ownerId)
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,nif.ilike.%${filters.search}%`)
  }

  return query
}

// Internal function to get prestadores data
async function getPrestadoresInternal(filters: PrestadorFilters = {}) {
  const sortBy = filters.sortBy || 'name'
  const sortOrder = filters.sortOrder || 'asc'
  const ascending = sortOrder === 'asc'

  let query = createAdminClient()
    .from('providers')
    .select(`
      *,
      relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email)
    `)

  query = applyPrestadorFilters(query, filters)
  query = query.order(sortBy, { ascending })

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar prestadores:', error)
    return []
  }

  return data || []
}

// Obter prestadores com paginação
export async function getPrestadores(filters: PrestadorFilters = {}): Promise<PaginatedPrestadores> {
  const page = filters.page || 1
  const limit = filters.limit || 50
  const from = (page - 1) * limit
  const to = from + limit - 1
  const sortBy = filters.sortBy || 'name'
  const sortOrder = filters.sortOrder || 'asc'
  const ascending = sortOrder === 'asc'

  // First get total count with filters
  let countQuery = createAdminClient()
    .from('providers')
    .select('*', { count: 'exact', head: true })

  countQuery = applyPrestadorFilters(countQuery, filters)
  const { count } = await countQuery

  // Now get paginated data
  let query = createAdminClient()
    .from('providers')
    .select(`
      *,
      relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email)
    `)

  query = applyPrestadorFilters(query, filters)
  query = query
    .order(sortBy, { ascending })
    .range(from, to)

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar prestadores:', error)
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    }
  }

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  }
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
  // Use count queries to avoid Supabase's default 1000 row limit
  const supabase = createAdminClient()

  const [totalResult, novoResult, onboardingResult, ativoResult, suspensoResult, abandonadoResult] = await Promise.all([
    supabase.from('providers').select('*', { count: 'exact', head: true }),
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'novo'),
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'em_onboarding'),
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'suspenso'),
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'abandonado'),
  ])

  return {
    novo: novoResult.count || 0,
    em_onboarding: onboardingResult.count || 0,
    ativo: ativoResult.count || 0,
    suspenso: suspensoResult.count || 0,
    abandonado: abandonadoResult.count || 0,
    total: totalResult.count || 0,
  }
}

// Obter distritos unicos
export async function getDistinctPrestadorDistricts() {
  return unstable_cache(
    async () => {
      const { data, error } = await createAdminClient()
        .from('providers')
        .select('districts')
        .in('status', ['ativo', 'suspenso'])
        .not('districts', 'is', null)
        .limit(10000)

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
    },
    ['prestador-districts'],
    { revalidate: 3600, tags: ['prestador-districts'] }
  )()
}

// Obter servicos unicos
export async function getDistinctPrestadorServices() {
  return unstable_cache(
    async () => {
      const { data, error } = await createAdminClient()
        .from('providers')
        .select('services')
        .in('status', ['ativo', 'suspenso'])
        .not('services', 'is', null)
        .limit(10000)

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
    },
    ['prestador-services'],
    { revalidate: 3600, tags: ['prestador-services'] }
  )()
}

// Get service request counts for a list of providers (by backoffice_provider_id)
export async function getProviderServiceRequestCounts(backofficeProviderIds: number[]): Promise<Record<number, number>> {
  if (backofficeProviderIds.length === 0) return {}

  const supabase = createAdminClient()

  // Convert to strings for the query
  const providerIdStrings = backofficeProviderIds.map(String)

  // Get counts grouped by assigned_provider_id
  const { data, error } = await supabase
    .from('service_requests')
    .select('assigned_provider_id')
    .in('assigned_provider_id', providerIdStrings)

  if (error) {
    console.error('Error fetching service request counts:', error)
    return {}
  }

  // Count occurrences
  const counts: Record<number, number> = {}
  for (const row of data || []) {
    if (row.assigned_provider_id) {
      const id = parseInt(row.assigned_provider_id, 10)
      counts[id] = (counts[id] || 0) + 1
    }
  }

  return counts
}

// Obter usuarios para select (apenas Relationship Managers)
export async function getUsers() {
  return unstable_cache(
    async () => {
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
    },
    ['users-rm'],
    { revalidate: 600, tags: ['users-rm'] }
  )()
}
