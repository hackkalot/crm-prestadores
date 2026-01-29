'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type ProviderUpdate = Database['public']['Tables']['providers']['Update']

// Type for secondary contacts
export interface SecondaryContact {
  value: string
  label?: string
}

/**
 * Update provider profile fields
 */
export async function updateProviderProfile(
  providerId: string,
  data: {
    name?: string
    email?: string
    phone?: string | null
    nif?: string | null
    website?: string | null
    facebook_url?: string | null
    instagram_url?: string | null
    linkedin_url?: string | null
    twitter_url?: string | null
    iban?: string | null
    entity_type?: 'tecnico' | 'eni' | 'empresa'
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // Get current values for comparison
  const { data: currentProvider } = await adminClient
    .from('providers')
    .select('name, email, phone, nif, website, facebook_url, instagram_url, linkedin_url, twitter_url, iban, entity_type')
    .eq('id', providerId)
    .single()

  // Prepare update object
  const updateData: ProviderUpdate = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  // Update provider
  const { error } = await adminClient
    .from('providers')
    .update(updateData)
    .eq('id', providerId)

  if (error) {
    console.error('Error updating provider:', error)
    return { error: 'Erro ao atualizar prestador' }
  }

  // Build old_value with only changed fields
  const oldValue: Record<string, unknown> = {}
  const newValue: Record<string, unknown> = {}
  const changedFields: string[] = []

  for (const [key, value] of Object.entries(data)) {
    const oldVal = currentProvider?.[key as keyof typeof currentProvider]
    if (oldVal !== value) {
      oldValue[key] = oldVal
      newValue[key] = value
      changedFields.push(key)
    }
  }

  // Log the change with field-level tracking
  if (changedFields.length > 0) {
    await adminClient.from('history_log').insert({
      provider_id: providerId,
      event_type: 'field_change',
      description: `Campos alterados: ${changedFields.join(', ')}`,
      old_value: oldValue,
      new_value: newValue,
      created_by: user.id,
    })
  }

  revalidatePath(`/providers/${providerId}`)
  return {}
}

/**
 * Update provider coverage and services directly in providers table
 */
export async function updateProviderCoverageAndServices(
  providerId: string,
  data: {
    selected_services: string[]
    coverage_municipalities: string[]
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // Get current values for comparison
  const { data: currentProvider } = await adminClient
    .from('providers')
    .select('services, counties')
    .eq('id', providerId)
    .single()

  const oldServices = (currentProvider?.services as string[]) || []
  const oldCounties = (currentProvider?.counties as string[]) || []

  // Update providers table directly (use same column names as forms submission)
  const { error: updateError } = await adminClient
    .from('providers')
    .update({
      services: data.selected_services,
      counties: data.coverage_municipalities,
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId)

  if (updateError) {
    console.error('Error updating coverage and services:', updateError)
    return { error: 'Erro ao atualizar cobertura e serviços' }
  }

  // Calculate what changed
  const servicesChanged = JSON.stringify(oldServices.sort()) !== JSON.stringify(data.selected_services.sort())
  const countiesChanged = JSON.stringify(oldCounties.sort()) !== JSON.stringify(data.coverage_municipalities.sort())

  // Log services change if changed
  if (servicesChanged) {
    const addedServiceIds = data.selected_services.filter(s => !oldServices.includes(s))
    const removedServiceIds = oldServices.filter(s => !data.selected_services.includes(s))

    // Fetch service names for better logging
    const allServiceIds = [...new Set([...addedServiceIds, ...removedServiceIds, ...oldServices, ...data.selected_services])]
    const { data: serviceNames } = await adminClient
      .from('service_prices')
      .select('id, service_name')
      .in('id', allServiceIds)

    const serviceNameMap = new Map(serviceNames?.map(s => [s.id, s.service_name]) || [])
    const getServiceName = (id: string) => serviceNameMap.get(id) || id

    const addedServices = addedServiceIds.map(getServiceName)
    const removedServices = removedServiceIds.map(getServiceName)

    // Build description based on what changed
    const descParts: string[] = []
    if (addedServices.length > 0) descParts.push(`${addedServices.length} adicionados`)
    if (removedServices.length > 0) descParts.push(`${removedServices.length} removidos`)

    await adminClient.from('history_log').insert({
      provider_id: providerId,
      event_type: 'field_change',
      description: `Serviços: ${descParts.join(', ')}`,
      old_value: {
        count: oldServices.length,
        ...(removedServices.length > 0 && { removed: removedServices }),
      },
      new_value: {
        count: data.selected_services.length,
        ...(addedServices.length > 0 && { added: addedServices }),
      },
      created_by: user.id,
    })
  }

  // Log coverage change if changed (counties are already names, not UUIDs)
  if (countiesChanged) {
    const addedCounties = data.coverage_municipalities.filter(c => !oldCounties.includes(c))
    const removedCounties = oldCounties.filter(c => !data.coverage_municipalities.includes(c))

    // Build description based on what changed
    const descParts: string[] = []
    if (addedCounties.length > 0) descParts.push(`${addedCounties.length} adicionados`)
    if (removedCounties.length > 0) descParts.push(`${removedCounties.length} removidos`)

    await adminClient.from('history_log').insert({
      provider_id: providerId,
      event_type: 'field_change',
      description: `Cobertura: ${descParts.join(', ')}`,
      old_value: {
        count: oldCounties.length,
        ...(removedCounties.length > 0 && { removed: removedCounties }),
      },
      new_value: {
        count: data.coverage_municipalities.length,
        ...(addedCounties.length > 0 && { added: addedCounties }),
      },
      created_by: user.id,
    })
  }

  revalidatePath(`/providers/${providerId}`)
  return {}
}

// Field labels for history log descriptions
const fieldLabels: Record<string, string> = {
  has_activity_declaration: 'Declaração de Atividade',
  has_liability_insurance: 'Seguro RC',
  has_work_accidents_insurance: 'Seguro Acidentes',
  certifications: 'Certificações',
  works_with_platforms: 'Plataformas',
  available_weekdays: 'Dias da semana',
  work_hours_start: 'Horário início',
  work_hours_end: 'Horário fim',
  num_technicians: 'Número de técnicos',
  has_own_transport: 'Viatura própria',
  has_computer: 'Computador',
  own_equipment: 'Equipamento próprio',
}

/**
 * Update provider documentation, resources and availability fields
 * These fields are now stored directly in providers table (not provider_forms_data)
 */
export async function updateProviderFormsFields(
  providerId: string,
  data: Partial<{
    has_activity_declaration: boolean
    has_liability_insurance: boolean
    has_work_accidents_insurance: boolean
    certifications: string[]
    works_with_platforms: string[]
    available_weekdays: string[]
    work_hours_start: string
    work_hours_end: string
    num_technicians: number
    has_own_transport: boolean
    has_computer: boolean
    own_equipment: string[]
  }>
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // Get current values for comparison
  const { data: currentProvider } = await adminClient
    .from('providers')
    .select('has_activity_declaration, has_liability_insurance, has_work_accidents_insurance, certifications, works_with_platforms, available_weekdays, work_hours_start, work_hours_end, num_technicians, has_own_transport, has_computer, own_equipment')
    .eq('id', providerId)
    .single()

  // Update providers table directly
  const { error: updateError } = await adminClient
    .from('providers')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId)

  if (updateError) {
    console.error('Error updating provider forms fields:', updateError)
    return { error: 'Erro ao atualizar dados do prestador' }
  }

  // Build old_value and new_value with only changed fields
  const oldValue: Record<string, unknown> = {}
  const newValue: Record<string, unknown> = {}
  const changedFields: string[] = []

  for (const [key, value] of Object.entries(data)) {
    const oldVal = currentProvider?.[key as keyof typeof currentProvider]

    // Compare arrays properly
    const isArray = Array.isArray(value)
    const hasChanged = isArray
      ? JSON.stringify(oldVal) !== JSON.stringify(value)
      : oldVal !== value

    if (hasChanged) {
      oldValue[key] = oldVal
      newValue[key] = value
      changedFields.push(fieldLabels[key] || key)
    }
  }

  // Log the change with field-level tracking
  if (changedFields.length > 0) {
    await adminClient.from('history_log').insert({
      provider_id: providerId,
      event_type: 'field_change',
      description: `Campos alterados: ${changedFields.join(', ')}`,
      old_value: oldValue,
      new_value: newValue,
      created_by: user.id,
    })
  }

  revalidatePath(`/providers/${providerId}`)
  return {}
}

/**
 * Update provider secondary contacts (phones and emails)
 */
export async function updateProviderSecondaryContacts(
  providerId: string,
  data: {
    secondary_phones?: SecondaryContact[]
    secondary_emails?: SecondaryContact[]
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // Get current values for comparison
  const { data: currentProvider } = await adminClient
    .from('providers')
    .select('secondary_phones, secondary_emails')
    .eq('id', providerId)
    .single()

  // Update providers table
  const { error: updateError } = await adminClient
    .from('providers')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId)

  if (updateError) {
    console.error('Error updating secondary contacts:', updateError)
    return { error: 'Erro ao atualizar contactos' }
  }

  // Log the change
  const changedFields: string[] = []
  if (data.secondary_phones !== undefined) changedFields.push('Telemóveis secundários')
  if (data.secondary_emails !== undefined) changedFields.push('Emails secundários')

  if (changedFields.length > 0) {
    await adminClient.from('history_log').insert({
      provider_id: providerId,
      event_type: 'field_change',
      description: `Contactos alterados: ${changedFields.join(', ')}`,
      old_value: {
        secondary_phones: currentProvider?.secondary_phones,
        secondary_emails: currentProvider?.secondary_emails,
      },
      new_value: data,
      created_by: user.id,
    })
  }

  revalidatePath(`/providers/${providerId}`)
  return {}
}

/**
 * Update provider raw services (text list from candidatura)
 */
export async function updateProviderRawServices(
  providerId: string,
  services: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // Get current values for comparison
  const { data: currentProvider } = await adminClient
    .from('providers')
    .select('services')
    .eq('id', providerId)
    .single()

  const oldServices = (currentProvider?.services as string[]) || []

  // Update providers table
  const { error: updateError } = await adminClient
    .from('providers')
    .update({
      services: services,
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId)

  if (updateError) {
    console.error('Error updating raw services:', updateError)
    return { error: 'Erro ao atualizar serviços' }
  }

  // Log the change if services changed
  if (JSON.stringify(oldServices.sort()) !== JSON.stringify(services.sort())) {
    await adminClient.from('history_log').insert({
      provider_id: providerId,
      event_type: 'field_change',
      description: `Serviços (texto) alterados`,
      old_value: { services: oldServices, count: oldServices.length },
      new_value: { services: services, count: services.length },
      created_by: user.id,
    })
  }

  revalidatePath(`/providers/${providerId}`)
  return {}
}
