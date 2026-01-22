'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { unstable_cache } from 'next/cache'

// UUID regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolve service names from UUIDs or return original text
 * Services can be either UUIDs (from form submission) or plain text (from HubSpot import)
 */
export async function resolveServiceNames(services: string[]): Promise<string[]> {
  if (!services || services.length === 0) return []

  // Separate UUIDs from plain text
  const uuids: string[] = []
  const textServices: string[] = []

  for (const service of services) {
    if (UUID_REGEX.test(service)) {
      uuids.push(service)
    } else {
      textServices.push(service)
    }
  }

  // If no UUIDs, return original services
  if (uuids.length === 0) return services

  // Fetch service names for UUIDs
  const { data: serviceData } = await createAdminClient()
    .from('service_prices')
    .select('id, service_name')
    .in('id', uuids)

  // Create a map of UUID -> service_name
  const serviceMap = new Map<string, string>()
  if (serviceData) {
    for (const service of serviceData) {
      serviceMap.set(service.id, service.service_name)
    }
  }

  // Resolve all services and deduplicate
  const resolvedServices = services.map(service => {
    if (UUID_REGEX.test(service)) {
      return serviceMap.get(service) || service // Return name or original UUID if not found
    }
    return service
  })

  // Return unique services only
  return [...new Set(resolvedServices)]
}

/**
 * Cached version of resolveServiceNames for better performance
 * Cache is revalidated every 5 minutes
 */
export const resolveServiceNamesCached = unstable_cache(
  async (services: string[]) => resolveServiceNames(services),
  ['resolve-service-names'],
  { revalidate: 300 }
)

/**
 * Bulk resolve service names for multiple providers
 * More efficient when loading lists
 */
export async function bulkResolveServiceNames(
  providers: Array<{ id: string; services: string[] | null }>
): Promise<Map<string, string[]>> {
  // Collect all unique UUIDs
  const allUuids = new Set<string>()
  for (const provider of providers) {
    if (provider.services) {
      for (const service of provider.services) {
        if (UUID_REGEX.test(service)) {
          allUuids.add(service)
        }
      }
    }
  }

  // Fetch all service names at once
  const serviceMap = new Map<string, string>()
  if (allUuids.size > 0) {
    const { data: serviceData } = await createAdminClient()
      .from('service_prices')
      .select('id, service_name')
      .in('id', Array.from(allUuids))

    if (serviceData) {
      for (const service of serviceData) {
        serviceMap.set(service.id, service.service_name)
      }
    }
  }

  // Build result map with unique services
  const result = new Map<string, string[]>()
  for (const provider of providers) {
    if (provider.services) {
      const resolvedServices = provider.services.map(service => {
        if (UUID_REGEX.test(service)) {
          return serviceMap.get(service) || service
        }
        return service
      })
      // Deduplicate services
      result.set(provider.id, [...new Set(resolvedServices)])
    } else {
      result.set(provider.id, [])
    }
  }

  return result
}

// Get provider basic info + onboarding card (for header display)
export async function getProviderBasicInfo(id: string) {
  const supabaseAdmin = createAdminClient()

  const { data: provider, error } = await supabaseAdmin
    .from('providers')
    .select(`
      *,
      relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !provider) {
    return null
  }

  // Get onboarding card with tasks (needed for header stats)
  const { data: onboardingCard } = await supabaseAdmin
    .from('onboarding_cards')
    .select(`
      *,
      current_stage:stage_definitions!onboarding_cards_current_stage_id_fkey(id, name, stage_number, display_order),
      tasks:onboarding_tasks(
        id,
        status,
        deadline_at
      )
    `)
    .eq('provider_id', id)
    .single()

  return {
    provider,
    onboardingCard,
  }
}

// Get application history
export async function getProviderApplicationHistory(id: string) {
  const { data } = await createAdminClient()
    .from('provider_applications')
    .select('*')
    .eq('provider_id', id)
    .order('applied_at', { ascending: false })

  return data || []
}

// Get onboarding card with full details
export async function getProviderOnboarding(id: string) {
  const { data } = await createAdminClient()
    .from('onboarding_cards')
    .select(`
      *,
      current_stage:stage_definitions!onboarding_cards_current_stage_id_fkey(id, name, stage_number, display_order),
      tasks:onboarding_tasks(
        *,
        task_definition:task_definitions(
          *,
          stage:stage_definitions(id, name, stage_number, display_order)
        )
      )
    `)
    .eq('provider_id', id)
    .single()

  return data
}

// Get notes
export async function getProviderNotes(id: string) {
  const { data } = await createAdminClient()
    .from('notes')
    .select(`
      *,
      user:users!notes_created_by_fkey(id, name, email)
    `)
    .eq('provider_id', id)
    .order('created_at', { ascending: false })

  return data || []
}

// Get history
export async function getProviderHistory(id: string) {
  const { data } = await createAdminClient()
    .from('history_log')
    .select(`
      *,
      user:users!history_log_created_by_fkey(id, name, email)
    `)
    .eq('provider_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  return data || []
}

export async function getUsers() {
  return unstable_cache(
    async () => {
      const supabaseAdmin = createAdminClient()

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, name, email, role')
        .eq('role', 'relationship_manager')
        .eq('approval_status', 'approved')
        .order('name')

      if (error) {
        console.error('Error fetching users:', error)
        return []
      }

      return data || []
    },
    ['users-all-rm'],
    { revalidate: 600, tags: ['users-all-rm'] }
  )()
}

export type UpdateRelationshipOwnerState = {
  error?: string
  success?: boolean
}

export async function updateRelationshipOwner(
  prevState: UpdateRelationshipOwnerState,
  formData: FormData
): Promise<UpdateRelationshipOwnerState> {
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

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('providers')
    .update({ relationship_owner_id: newOwnerId })
    .eq('id', providerId)

  if (error) {
    console.error('Error updating relationship owner:', error)
    return { error: 'Erro ao atualizar responsável' }
  }

  // Registar no histórico
  await adminClient.from('history_log').insert({
    provider_id: providerId,
    event_type: 'owner_change',
    description: 'Responsável alterado',
    old_value: { owner_id: currentProvider?.relationship_owner_id },
    new_value: { owner_id: newOwnerId },
    created_by: user.id,
  })

  revalidatePath(`/providers/${providerId}`)

  return { success: true }
}

// Update provider field
export type UpdateProviderFieldState = {
  error?: string
  success?: boolean
}

const fieldLabels: Record<string, string> = {
  // Contact info
  name: 'Nome',
  email: 'Email',
  phone: 'Telefone',
  // Company data
  nif: 'NIF',
  entity_type: 'Tipo de Entidade',
  num_technicians: 'Número de Técnicos',
  has_admin_team: 'Equipa Administrativa',
  has_own_transport: 'Transporte Próprio',
  working_hours: 'Horário Laboral',
  // Administrative
  iban: 'IBAN',
  activity_proof_url: 'Comprovativo de Atividade',
  // Social media
  website: 'Website',
  facebook_url: 'Facebook',
  instagram_url: 'Instagram',
  linkedin_url: 'LinkedIn',
  twitter_url: 'Twitter/X',
  // Arrays
  districts: 'Zonas de Atuação',
  services: 'Serviços',
}

export async function updateProviderField(
  prevState: UpdateProviderFieldState,
  formData: FormData
): Promise<UpdateProviderFieldState> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const fieldName = formData.get('fieldName') as string
  const fieldValueRaw = formData.get('fieldValue')
  const fieldType = formData.get('fieldType') as string | null // 'string' | 'number' | 'boolean' | 'array'

  if (!providerId || !fieldName) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // Obter valor atual
  const { data: currentProvider } = await adminClient
    .from('providers')
    .select(fieldName)
    .eq('id', providerId)
    .single()

  if (!currentProvider) {
    return { error: 'Prestador não encontrado' }
  }

  const oldValue = currentProvider[fieldName as keyof typeof currentProvider]

  // Parse value based on type
  let fieldValue: string | number | boolean | string[] | null = null

  if (fieldValueRaw !== null && fieldValueRaw !== undefined && fieldValueRaw !== '') {
    if (fieldType === 'number') {
      fieldValue = parseInt(fieldValueRaw as string, 10)
    } else if (fieldType === 'boolean') {
      fieldValue = fieldValueRaw === 'true'
    } else if (fieldType === 'array') {
      try {
        fieldValue = JSON.parse(fieldValueRaw as string)
      } catch {
        fieldValue = null
      }
    } else {
      fieldValue = fieldValueRaw as string
    }
  }

  // Atualizar campo
  const { error } = await adminClient
    .from('providers')
    .update({ [fieldName]: fieldValue })
    .eq('id', providerId)

  if (error) {
    console.error(`Error updating ${fieldName}:`, error)
    return { error: `Erro ao atualizar ${fieldLabels[fieldName] || fieldName}` }
  }

  // Registar no histórico
  const description = fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
    ? `${fieldLabels[fieldName] || fieldName} atualizado`
    : `${fieldLabels[fieldName] || fieldName} removido`

  const historyData = {
    provider_id: providerId,
    event_type: 'field_change',
    description,
    old_value: { [fieldName]: oldValue },
    new_value: { [fieldName]: fieldValue },
    created_by: user.id,
  }

  console.log('Attempting to insert history log:', historyData)

  const { error: historyError, data: historyInserted } = await adminClient.from('history_log').insert(historyData)

  if (historyError) {
    console.error('Error creating history log:', historyError)
    console.error('History data that failed:', historyData)
    // Continue mesmo se o log falhar
  } else {
    console.log('History log created successfully:', historyInserted)
  }

  revalidatePath(`/providers/${providerId}`)
  revalidatePath(`/providers/${providerId}?tab=historico`)

  return { success: true }
}
