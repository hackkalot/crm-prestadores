'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ServiceTemplate } from './utils'
import type { ServiceTemplateSections } from './utils'

// Re-export types from utils for convenience
export type { ServiceTemplate, ServiceTemplateSections } from './utils'

// Input type for creating/updating templates
export type ServiceTemplateInput = {
  service_name: string
  service_group?: string | null
  cluster?: string | null
  folder_path?: string | null
  file_name?: string | null
  content_markdown?: string | null
  sections?: ServiceTemplateSections | null
  is_active?: boolean
}

/**
 * Get templates for a list of service IDs (from provider.services)
 * First looks up service names from service_prices, then finds matching templates
 */
export async function getTemplatesForServices(
  serviceIds: string[]
): Promise<ServiceTemplate[]> {
  if (!serviceIds.length) return []

  const adminClient = createAdminClient()

  // First get service names from service_prices
  const { data: services, error: servicesError } = await adminClient
    .from('service_prices')
    .select('service_name')
    .in('id', serviceIds)

  if (servicesError) {
    console.error('Error fetching service names:', servicesError)
    return []
  }

  if (!services?.length) return []

  // Get unique service names
  const serviceNames = [...new Set(services.map(s => s.service_name))]

  // Get templates matching these service names
  const { data: templates, error: templatesError } = await adminClient
    .from('service_templates')
    .select('*')
    .in('service_name', serviceNames)
    .eq('is_active', true)
    .order('cluster')
    .order('service_name')

  if (templatesError) {
    console.error('Error fetching templates:', templatesError)
    return []
  }

  return templates || []
}

/**
 * Get template by service name
 */
export async function getTemplateByServiceName(
  serviceName: string
): Promise<ServiceTemplate | null> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('service_templates')
    .select('*')
    .eq('service_name', serviceName)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching template:', error)
    }
    return null
  }

  return data
}

/**
 * Get all active templates grouped by cluster
 */
export async function getAllTemplates(): Promise<ServiceTemplate[]> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('service_templates')
    .select('*')
    .eq('is_active', true)
    .order('cluster')
    .order('service_name')

  if (error) {
    console.error('Error fetching all templates:', error)
    return []
  }

  return data || []
}

/**
 * Get templates for a provider by ID
 * Fetches provider's services and returns matching templates
 */
export async function getTemplatesForProvider(
  providerId: string
): Promise<ServiceTemplate[]> {
  const adminClient = createAdminClient()

  // Get provider's services
  const { data: provider, error: providerError } = await adminClient
    .from('providers')
    .select('services')
    .eq('id', providerId)
    .single()

  if (providerError) {
    console.error('Error fetching provider:', providerError)
    return []
  }

  if (!provider?.services?.length) {
    return []
  }

  return getTemplatesForServices(provider.services)
}

/**
 * Generate service sheet HTML for a provider
 * Returns HTML string that can be converted to PDF on the client
 * Also returns snapshot data for history tracking
 */
export async function generateServiceSheetHTML(
  providerId: string
): Promise<{
  html: string
  providerName: string
  snapshotData: {
    provider: { name: string; nif: string | null; email: string }
    templates_count: number
    services_count: number
  }
} | { error: string }> {
  const adminClient = createAdminClient()

  // Get provider info
  const { data: provider, error: providerError } = await adminClient
    .from('providers')
    .select('id, name, email, nif, services')
    .eq('id', providerId)
    .single()

  if (providerError || !provider) {
    return { error: 'Prestador não encontrado' }
  }

  if (!provider.services?.length) {
    return { error: 'Prestador não tem serviços selecionados' }
  }

  // Get templates for provider's services
  const templates = await getTemplatesForServices(provider.services)

  // Get reference prices for provider's services
  const { data: referencePrices } = await adminClient
    .from('service_prices')
    .select('*')
    .in('id', provider.services)
    .eq('is_active', true)

  // Get custom prices for provider's services
  const { data: customPrices } = await adminClient
    .from('provider_custom_prices')
    .select('reference_price_id, custom_price_without_vat')
    .eq('provider_id', providerId)
    .in('reference_price_id', provider.services)

  // Create map of custom prices
  const customPriceMap = new Map<string, number>()
  if (customPrices) {
    for (const cp of customPrices) {
      customPriceMap.set(cp.reference_price_id, cp.custom_price_without_vat)
    }
  }

  // Apply custom prices to reference prices
  const prices = (referencePrices || []).map((refPrice) => {
    const customPrice = customPriceMap.get(refPrice.id)
    return {
      ...refPrice,
      price_base: customPrice ?? refPrice.price_base,
    }
  })

  // Check if any selected service is a Canalizador service (by service_group or service_name)
  const hasCanalizador = (referencePrices || []).some(
    (p) => p.service_group?.toLowerCase().includes('canalizador') ||
           p.service_name?.toLowerCase().includes('canalizador')
  )

  // Fetch materials if Canalizador is selected
  let materials: { id: string; material_name: string; category: string | null; price_without_vat: number; vat_rate: number }[] | undefined
  if (hasCanalizador) {
    const { data: materialsData } = await adminClient
      .from('material_catalog')
      .select('id, material_name, category, price_without_vat, vat_rate, is_active')
      .eq('is_active', true)
      .order('material_name')

    if (materialsData && materialsData.length > 0) {
      materials = materialsData
    }
  }

  // Import PDF generator dynamically to avoid issues with server components
  const { generateServiceSheetPDFHTML } = await import('./pdf-generator')

  const html = generateServiceSheetPDFHTML(
    templates,
    prices,
    {
      name: provider.name,
      email: provider.email,
      nif: provider.nif,
    },
    materials
  )

  return {
    html,
    providerName: provider.name,
    snapshotData: {
      provider: {
        name: provider.name,
        nif: provider.nif,
        email: provider.email || '',
      },
      templates_count: templates.length,
      services_count: prices.length,
    },
  }
}

// ========== CRUD Functions for Templates Management ==========

/**
 * Get templates with pagination and filters for the management table
 */
export async function getTemplatesForManagement(options?: {
  cluster?: string
  search?: string
  page?: number
  limit?: number
}): Promise<{ data: ServiceTemplate[]; total: number }> {
  const adminClient = createAdminClient()
  const page = options?.page || 1
  const limit = options?.limit || 50
  const offset = (page - 1) * limit

  let query = adminClient
    .from('service_templates')
    .select('*', { count: 'exact' })
    .eq('is_active', true)

  if (options?.cluster) {
    query = query.eq('cluster', options.cluster)
  }

  if (options?.search) {
    query = query.ilike('service_name', `%${options.search}%`)
  }

  query = query
    .order('cluster')
    .order('service_name')
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching templates:', error)
    return { data: [], total: 0 }
  }

  return { data: data || [], total: count || 0 }
}

/**
 * Get all unique clusters from templates
 */
export async function getTemplateClusters(): Promise<string[]> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('service_templates')
    .select('cluster')
    .eq('is_active', true)
    .not('cluster', 'is', null)

  if (error) {
    console.error('Error fetching clusters:', error)
    return []
  }

  // Get unique clusters
  const clusters = [...new Set(data?.map(d => d.cluster).filter(Boolean) as string[])]
  return clusters.sort()
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(id: string): Promise<ServiceTemplate | null> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('service_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching template:', error)
    }
    return null
  }

  return data
}

/**
 * Create a new template
 */
export async function createTemplate(
  input: ServiceTemplateInput
): Promise<{ success: boolean; error?: string; data?: ServiceTemplate }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  // Validation
  if (!input.service_name?.trim()) {
    return { success: false, error: 'Nome do serviço é obrigatório' }
  }

  const adminClient = createAdminClient()

  // Check if template with same service_name already exists
  const { data: existing } = await adminClient
    .from('service_templates')
    .select('id')
    .eq('service_name', input.service_name)
    .eq('is_active', true)
    .single()

  if (existing) {
    return { success: false, error: 'Já existe um template com este nome de serviço' }
  }

  const { data, error } = await adminClient
    .from('service_templates')
    .insert({
      service_name: input.service_name.trim(),
      service_group: input.service_group || null,
      cluster: input.cluster || null,
      folder_path: input.folder_path || '',
      file_name: input.file_name || '',
      content_markdown: input.content_markdown || '',
      sections: input.sections || {},
      is_active: true,
      version: 1,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating template:', error)
    return { success: false, error: 'Erro ao criar template' }
  }

  revalidatePath('/configuracoes')
  return { success: true, data }
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  id: string,
  input: Partial<ServiceTemplateInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // If changing service_name, check for duplicates
  if (input.service_name) {
    const { data: existing } = await adminClient
      .from('service_templates')
      .select('id')
      .eq('service_name', input.service_name)
      .eq('is_active', true)
      .neq('id', id)
      .single()

    if (existing) {
      return { success: false, error: 'Já existe outro template com este nome de serviço' }
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.service_name !== undefined) updateData.service_name = input.service_name?.trim() || null
  if (input.service_group !== undefined) updateData.service_group = input.service_group || null
  if (input.cluster !== undefined) updateData.cluster = input.cluster || null
  if (input.folder_path !== undefined) updateData.folder_path = input.folder_path || ''
  if (input.file_name !== undefined) updateData.file_name = input.file_name || ''
  if (input.content_markdown !== undefined) updateData.content_markdown = input.content_markdown || ''
  if (input.sections !== undefined) updateData.sections = input.sections || {}
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { error } = await adminClient
    .from('service_templates')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating template:', error)
    return { success: false, error: 'Erro ao atualizar template' }
  }

  revalidatePath('/configuracoes')
  return { success: true }
}

/**
 * Delete (soft delete) a template
 */
export async function deleteTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // Soft delete by setting is_active to false
  const { error } = await adminClient
    .from('service_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error deleting template:', error)
    return { success: false, error: 'Erro ao eliminar template' }
  }

  revalidatePath('/configuracoes')
  return { success: true }
}

/**
 * Get service name suggestions for autocomplete
 */
export async function getServiceNameSuggestionsFromPrices(
  search: string
): Promise<string[]> {
  if (!search || search.length < 2) return []

  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('service_prices')
    .select('service_name')
    .ilike('service_name', `%${search}%`)
    .eq('is_active', true)
    .limit(20)

  if (error) {
    console.error('Error fetching service name suggestions:', error)
    return []
  }

  // Get unique names
  const names = [...new Set(data?.map(d => d.service_name) || [])]
  return names.sort()
}

// ========== Service Sheet Snapshots ==========

// Tipo para os snapshots de fichas de serviço
export type ServiceSheetSnapshot = {
  id: string
  provider_id: string
  snapshot_name: string | null
  snapshot_data: {
    provider: {
      name: string
      nif: string | null
      email: string
    }
    templates_count: number
    services_count: number
    generated_at: string
  }
  created_at: string
  created_by: string | null
  created_by_user?: {
    name: string
    email: string
  } | null
}

/**
 * Save a service sheet snapshot when generating PDF
 */
export async function saveServiceSheetSnapshot(
  providerId: string,
  snapshotData: {
    provider: { name: string; nif: string | null; email: string }
    templates_count: number
    services_count: number
  }
): Promise<{ error?: string; snapshotId?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // Create snapshot with timestamp
  const now = new Date()
  const snapshotName = `Ficha ${now.toLocaleDateString('pt-PT')} ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`

  const { data: snapshot, error } = await adminClient
    .from('provider_service_sheet_snapshots')
    .insert({
      provider_id: providerId,
      snapshot_name: snapshotName,
      snapshot_data: {
        provider: snapshotData.provider,
        templates_count: snapshotData.templates_count,
        services_count: snapshotData.services_count,
        generated_at: now.toISOString(),
      },
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving service sheet snapshot:', error)
    return { error: 'Erro ao guardar snapshot' }
  }

  revalidatePath(`/providers/${providerId}`)
  return { snapshotId: snapshot.id }
}

/**
 * Get service sheet snapshots history for a provider
 */
export async function getServiceSheetSnapshots(providerId: string): Promise<ServiceSheetSnapshot[]> {
  const adminClient = createAdminClient()

  const { data: snapshots, error } = await adminClient
    .from('provider_service_sheet_snapshots')
    .select(`
      id,
      provider_id,
      snapshot_name,
      snapshot_data,
      created_at,
      created_by,
      users:created_by (
        name,
        email
      )
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching service sheet snapshots:', error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (snapshots || []).map((s: any) => ({
    id: s.id,
    provider_id: s.provider_id,
    snapshot_name: s.snapshot_name,
    snapshot_data: s.snapshot_data as ServiceSheetSnapshot['snapshot_data'],
    created_at: s.created_at,
    created_by: s.created_by,
    created_by_user: s.users ? { name: s.users.name, email: s.users.email } : null,
  }))
}
