'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type ServicePrice = Database['public']['Tables']['service_prices']['Row']
type ProviderPrice = Database['public']['Tables']['provider_prices']['Row']

// Helper para registar alterações de preços no history_log
async function logPriceChange(
  adminClient: ReturnType<typeof createAdminClient>,
  providerId: string,
  userId: string,
  eventType: 'price_change' | 'field_change',
  description: string,
  oldValue?: Record<string, unknown> | null,
  newValue?: Record<string, unknown> | null
) {
  try {
    await adminClient.from('history_log').insert({
      provider_id: providerId,
      event_type: eventType,
      description,
      old_value: oldValue || null,
      new_value: newValue || null,
      created_by: userId,
    })
  } catch (error) {
    console.error('Error logging price change:', error)
  }
}

export type PricingService = ServicePrice & {
  provider_price?: {
    id: string
    custom_price_without_vat: number | null
    is_selected_for_proposal: boolean | null
    notes: string | null
  } | null
}

export type PricingCluster = {
  cluster: string
  services: PricingService[]
}

/**
 * Get all reference prices grouped by cluster with provider's custom prices
 */
export async function getProviderPricingOptions(providerId: string): Promise<PricingCluster[]> {
  const supabase = createAdminClient()

  // Get all active reference prices
  const { data: referencePrices, error: refError } = await supabase
    .from('service_prices')
    .select('*')
    .eq('is_active', true)
    .order('service_name')
    .order('unit_description')

  if (refError) {
    console.error('Error fetching reference prices:', refError)
    return []
  }

  // Get provider's custom prices
  const { data: providerPrices, error: provError } = await supabase
    .from('provider_prices')
    .select('*')
    .eq('provider_id', providerId)

  if (provError) {
    console.error('Error fetching provider prices:', provError)
  }

  // Create a map of reference_price_id -> provider_price
  const priceMap = new Map<string, ProviderPrice>()
  if (providerPrices) {
    for (const price of providerPrices) {
      priceMap.set(price.reference_price_id, price)
    }
  }

  // Merge reference prices with provider prices
  const servicesWithPrices: PricingService[] = referencePrices.map((refPrice) => {
    const provPrice = priceMap.get(refPrice.id)
    return {
      ...refPrice,
      provider_price: provPrice
        ? {
            id: provPrice.id,
            custom_price_without_vat: provPrice.custom_price_without_vat,
            is_selected_for_proposal: provPrice.is_selected_for_proposal,
            notes: provPrice.notes,
          }
        : null,
    }
  })

  // Group by cluster
  const clusterMap = new Map<string, PricingService[]>()
  for (const service of servicesWithPrices) {
    const existing = clusterMap.get(service.cluster) || []
    existing.push(service)
    clusterMap.set(service.cluster, existing)
  }

  // Convert to array
  const clusters: PricingCluster[] = Array.from(clusterMap.entries()).map(([cluster, services]) => ({
    cluster,
    services,
  }))

  // Sort by cluster name
  clusters.sort((a, b) => a.cluster.localeCompare(b.cluster))

  return clusters
}

/**
 * Toggle service selection for proposal
 */
export async function toggleServiceSelection(
  providerId: string,
  referencePriceId: string,
  isSelected: boolean
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

  // Get service name for logging
  const { data: servicePrice } = await adminClient
    .from('service_prices')
    .select('service_name')
    .eq('id', referencePriceId)
    .single()

  const serviceName = servicePrice?.service_name || 'Serviço'

  // Check if provider_price record exists
  const { data: existing } = await adminClient
    .from('provider_prices')
    .select('id, is_selected_for_proposal')
    .eq('provider_id', providerId)
    .eq('reference_price_id', referencePriceId)
    .single()

  const oldSelected = existing?.is_selected_for_proposal ?? false

  if (existing) {
    // Update existing record
    const { error } = await adminClient
      .from('provider_prices')
      .update({
        is_selected_for_proposal: isSelected,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating provider price:', error)
      return { error: 'Erro ao atualizar seleção' }
    }

    // Log the change
    await logPriceChange(
      adminClient,
      providerId,
      user.id,
      'price_change',
      `Serviço "${serviceName}" ${isSelected ? 'selecionado' : 'desselecionado'} para proposta`,
      { service: serviceName, is_selected: oldSelected },
      { service: serviceName, is_selected: isSelected }
    )
  } else {
    // Create new record
    const { error } = await adminClient.from('provider_prices').insert({
      provider_id: providerId,
      reference_price_id: referencePriceId,
      is_selected_for_proposal: isSelected,
      created_by: user.id,
      updated_by: user.id,
    })

    // Log new service added
    if (!error) {
      await logPriceChange(
        adminClient,
        providerId,
        user.id,
        'price_change',
        `Serviço "${serviceName}" adicionado ${isSelected ? 'e selecionado' : ''} para proposta`,
        null,
        { service: serviceName, is_selected: isSelected }
      )
    }

    if (error) {
      console.error('Error creating provider price:', error)
      return { error: 'Erro ao criar seleção' }
    }
  }

  revalidatePath(`/providers/${providerId}`)
  return {}
}

/**
 * Update custom price for a service
 */
export async function updateCustomPrice(
  providerId: string,
  referencePriceId: string,
  customPrice: number | null
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

  // Get service name for logging
  const { data: servicePrice } = await adminClient
    .from('service_prices')
    .select('service_name, price_base')
    .eq('id', referencePriceId)
    .single()

  const serviceName = servicePrice?.service_name || 'Serviço'

  // Check if provider_price record exists
  const { data: existing } = await adminClient
    .from('provider_prices')
    .select('id, custom_price_without_vat')
    .eq('provider_id', providerId)
    .eq('reference_price_id', referencePriceId)
    .single()

  const oldPrice = existing?.custom_price_without_vat

  if (existing) {
    // Update existing record
    const { error } = await adminClient
      .from('provider_prices')
      .update({
        custom_price_without_vat: customPrice,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating custom price:', error)
      return { error: 'Erro ao atualizar preço' }
    }

    // Log the price change
    await logPriceChange(
      adminClient,
      providerId,
      user.id,
      'price_change',
      `Preço personalizado de "${serviceName}" alterado de ${oldPrice ?? 'referência'}€ para ${customPrice ?? 'referência'}€`,
      { service: serviceName, custom_price: oldPrice, reference_price: servicePrice?.price_base },
      { service: serviceName, custom_price: customPrice, reference_price: servicePrice?.price_base }
    )
  } else {
    // Create new record
    const { error } = await adminClient.from('provider_prices').insert({
      provider_id: providerId,
      reference_price_id: referencePriceId,
      custom_price_without_vat: customPrice,
      created_by: user.id,
      updated_by: user.id,
    })

    if (!error && customPrice !== null) {
      await logPriceChange(
        adminClient,
        providerId,
        user.id,
        'price_change',
        `Preço personalizado de "${serviceName}" definido como ${customPrice}€`,
        null,
        { service: serviceName, custom_price: customPrice, reference_price: servicePrice?.price_base }
      )
    }

    if (error) {
      console.error('Error creating provider price:', error)
      return { error: 'Erro ao criar preço' }
    }
  }

  revalidatePath(`/providers/${providerId}`)
  return {}
}

/**
 * Bulk update service selections
 */
export async function bulkToggleServices(
  providerId: string,
  referencePriceIds: string[],
  isSelected: boolean
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

  // Get existing records
  const { data: existing } = await adminClient
    .from('provider_prices')
    .select('id, reference_price_id')
    .eq('provider_id', providerId)
    .in('reference_price_id', referencePriceIds)

  const existingMap = new Map<string, string>()
  if (existing) {
    for (const record of existing) {
      existingMap.set(record.reference_price_id, record.id)
    }
  }

  // Update existing records
  const updateIds = Array.from(existingMap.values())
  if (updateIds.length > 0) {
    const { error: updateError } = await adminClient
      .from('provider_prices')
      .update({
        is_selected_for_proposal: isSelected,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .in('id', updateIds)

    if (updateError) {
      console.error('Error updating provider prices:', updateError)
      return { error: 'Erro ao atualizar seleções' }
    }
  }

  // Create new records for non-existing ones
  const newRecords = referencePriceIds
    .filter((refId) => !existingMap.has(refId))
    .map((refId) => ({
      provider_id: providerId,
      reference_price_id: refId,
      is_selected_for_proposal: isSelected,
      created_by: user.id,
      updated_by: user.id,
    }))

  if (newRecords.length > 0) {
    const { error: insertError } = await adminClient.from('provider_prices').insert(newRecords)

    if (insertError) {
      console.error('Error creating provider prices:', insertError)
      return { error: 'Erro ao criar seleções' }
    }
  }

  // Log bulk change
  const totalCount = referencePriceIds.length
  await logPriceChange(
    adminClient,
    providerId,
    user.id,
    'price_change',
    `${totalCount} serviços ${isSelected ? 'selecionados' : 'desselecionados'} em massa`,
    { services_count: totalCount, action: isSelected ? 'select' : 'deselect' },
    { services_count: totalCount, is_selected: isSelected }
  )

  revalidatePath(`/providers/${providerId}`)
  return {}
}

/**
 * Auto-select services based on forms submission
 */
export async function autoSelectServicesFromForms(
  providerId: string,
  selectedServiceIds: string[]
): Promise<{ error?: string; count?: number }> {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // Get existing records
  const { data: existing } = await adminClient
    .from('provider_prices')
    .select('id, reference_price_id')
    .eq('provider_id', providerId)
    .in('reference_price_id', selectedServiceIds)

  const existingMap = new Map<string, string>()
  if (existing) {
    for (const record of existing) {
      existingMap.set(record.reference_price_id, record.id)
    }
  }

  // Update existing records
  const updateIds = Array.from(existingMap.values())
  if (updateIds.length > 0) {
    const { error: updateError } = await adminClient
      .from('provider_prices')
      .update({
        is_selected_for_proposal: true,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .in('id', updateIds)

    if (updateError) {
      console.error('Error updating provider prices:', updateError)
      return { error: 'Erro ao atualizar seleções' }
    }
  }

  // Create new records for non-existing ones
  const newRecords = selectedServiceIds
    .filter((refId) => !existingMap.has(refId))
    .map((refId) => ({
      provider_id: providerId,
      reference_price_id: refId,
      is_selected_for_proposal: true,
      created_by: user.id,
      updated_by: user.id,
    }))

  if (newRecords.length > 0) {
    const { error: insertError } = await adminClient.from('provider_prices').insert(newRecords)

    if (insertError) {
      console.error('Error creating provider prices:', insertError)
      return { error: 'Erro ao criar seleções' }
    }
  }

  // Log auto-selection from forms
  const totalCount = selectedServiceIds.length
  await logPriceChange(
    adminClient,
    providerId,
    user.id,
    'price_change',
    `${totalCount} serviços auto-selecionados a partir do formulário`,
    null,
    { services_count: totalCount, source: 'forms_submission', is_selected: true }
  )

  revalidatePath(`/providers/${providerId}`)
  return { count: selectedServiceIds.length }
}

/**
 * Generate PDF HTML for selected services only
 */
export async function generateProposalPDFData(providerId: string): Promise<{
  error?: string
  data?: {
    provider: {
      id: string
      name: string
      nif: string | null
      email: string
    }
    pricingTable: Array<{
      category: {
        id: string
        name: string
        cluster: string
        vat_rate: number
      }
      services: Array<{
        id: string
        name: string
        unit: string | null
        provider_price: number
        variant_name: string | null
      }>
    }>
  }
}> {
  const supabase = createAdminClient()

  // Get provider info
  const { data: provider, error: provError } = await supabase
    .from('providers')
    .select('id, name, nif, email')
    .eq('id', providerId)
    .single()

  if (provError || !provider) {
    return { error: 'Prestador não encontrado' }
  }

  // Get all selected services with their prices
  const { data: selectedPrices, error: pricesError } = await supabase
    .from('provider_prices')
    .select(
      `
      id,
      reference_price_id,
      custom_price_without_vat,
      is_selected_for_proposal,
      service_prices (
        id,
        service_name,
        unit_description,
        cluster,
        vat_rate,
        typology,
        price_base,
        price_hour_with_materials
      )
    `
    )
    .eq('provider_id', providerId)
    .eq('is_selected_for_proposal', true)

  if (pricesError) {
    console.error('Error fetching selected prices:', pricesError)
    return { error: 'Erro ao buscar preços selecionados' }
  }

  if (!selectedPrices || selectedPrices.length === 0) {
    return { error: 'Nenhum serviço selecionado para gerar PDF' }
  }

  // Group by cluster
  const clusterMap = new Map<
    string,
    Array<{
      id: string
      name: string
      unit: string | null
      provider_price: number
      variant_name: string | null
      vat_rate: number
    }>
  >()

  for (const priceRecord of selectedPrices) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refPrice = (priceRecord as any).service_prices
    if (!refPrice) continue

    const cluster = refPrice.cluster || 'Sem Cluster'
    const finalPrice =
      priceRecord.custom_price_without_vat ?? refPrice.price_base ?? refPrice.price_hour_with_materials ?? 0

    const serviceData = {
      id: refPrice.id,
      name: refPrice.service_name,
      unit: refPrice.unit_description,
      provider_price: finalPrice,
      variant_name: refPrice.typology,
      vat_rate: refPrice.vat_rate,
    }

    if (!clusterMap.has(cluster)) {
      clusterMap.set(cluster, [])
    }
    clusterMap.get(cluster)!.push(serviceData)
  }

  // Convert to array structure
  const pricingTable = Array.from(clusterMap.entries()).map(([cluster, services]) => ({
    category: {
      id: cluster,
      name: cluster,
      cluster,
      vat_rate: services[0].vat_rate, // Use first service's VAT
    },
    services,
  }))

  return {
    data: {
      provider: {
        id: provider.id,
        name: provider.name,
        nif: provider.nif,
        email: provider.email || '',
      },
      pricingTable,
    },
  }
}
