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

// Tipo para os dados do PDF (compatível com CatalogPrice do service-catalog)
export type ProposalPDFPrice = {
  id: string
  service_name: string
  cluster: string
  service_group: string | null
  unit_description: string
  typology: string | null
  vat_rate: number
  launch_date: string | null
  price_base: number | null
  price_new_visit: number | null
  price_extra_night: number | null
  price_hour_no_materials: number | null
  price_hour_with_materials: number | null
  price_cleaning: number | null
  price_cleaning_treatments: number | null
  price_cleaning_imper: number | null
  price_cleaning_imper_treatments: number | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Generate PDF data for selected services (returns format compatible with generateCatalogPricePDFHTML)
 */
export async function generateProposalPDFData(providerId: string): Promise<{
  error?: string
  data?: {
    provider: {
      name: string
      nif: string | null
      email: string
    }
    prices: ProposalPDFPrice[]
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

  // Get all selected services with ALL their price fields
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
        cluster,
        service_group,
        unit_description,
        typology,
        vat_rate,
        launch_date,
        price_base,
        price_new_visit,
        price_extra_night,
        price_hour_no_materials,
        price_hour_with_materials,
        price_cleaning,
        price_cleaning_treatments,
        price_cleaning_imper,
        price_cleaning_imper_treatments,
        is_active,
        created_at,
        updated_at
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

  // Transform to ProposalPDFPrice format, applying custom prices where set
  const prices: ProposalPDFPrice[] = []

  for (const priceRecord of selectedPrices) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refPrice = (priceRecord as any).service_prices
    if (!refPrice) continue

    // Apply custom price to price_base if set
    const finalPriceBase = priceRecord.custom_price_without_vat ?? refPrice.price_base

    prices.push({
      id: refPrice.id,
      service_name: refPrice.service_name,
      cluster: refPrice.cluster || 'Outros',
      service_group: refPrice.service_group,
      unit_description: refPrice.unit_description,
      typology: refPrice.typology,
      vat_rate: refPrice.vat_rate,
      launch_date: refPrice.launch_date,
      price_base: finalPriceBase,
      price_new_visit: refPrice.price_new_visit,
      price_extra_night: refPrice.price_extra_night,
      price_hour_no_materials: refPrice.price_hour_no_materials,
      price_hour_with_materials: refPrice.price_hour_with_materials,
      price_cleaning: refPrice.price_cleaning,
      price_cleaning_treatments: refPrice.price_cleaning_treatments,
      price_cleaning_imper: refPrice.price_cleaning_imper,
      price_cleaning_imper_treatments: refPrice.price_cleaning_imper_treatments,
      is_active: refPrice.is_active,
      created_at: refPrice.created_at,
      updated_at: refPrice.updated_at,
    })
  }

  return {
    data: {
      provider: {
        name: provider.name,
        nif: provider.nif,
        email: provider.email || '',
      },
      prices,
    },
  }
}

// Tipo para os snapshots de preços
export type PricingSnapshot = {
  id: string
  provider_id: string
  snapshot_name: string | null
  snapshot_data: {
    provider: {
      name: string
      nif: string | null
      email: string
    }
    prices: ProposalPDFPrice[]
    generated_at: string
    services_count: number
  }
  created_at: string
  created_by: string | null
  created_by_user?: {
    name: string
    email: string
  } | null
}

/**
 * Save a pricing snapshot when generating PDF
 */
export async function savePricingSnapshot(
  providerId: string,
  snapshotData: {
    provider: { name: string; nif: string | null; email: string }
    prices: ProposalPDFPrice[]
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
  const snapshotName = `Proposta ${now.toLocaleDateString('pt-PT')} ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`

  const { data: snapshot, error } = await adminClient
    .from('provider_price_snapshots')
    .insert({
      provider_id: providerId,
      snapshot_name: snapshotName,
      snapshot_data: {
        provider: snapshotData.provider,
        prices: snapshotData.prices,
        generated_at: now.toISOString(),
        services_count: snapshotData.prices.length,
      },
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving pricing snapshot:', error)
    return { error: 'Erro ao guardar snapshot' }
  }

  // Log the snapshot creation
  await logPriceChange(
    adminClient,
    providerId,
    user.id,
    'price_change',
    `Proposta de preços gerada com ${snapshotData.prices.length} serviços`,
    null,
    { snapshot_id: snapshot.id, services_count: snapshotData.prices.length }
  )

  revalidatePath(`/providers/${providerId}`)
  return { snapshotId: snapshot.id }
}

/**
 * Get pricing snapshots history for a provider
 */
export async function getPricingSnapshots(providerId: string): Promise<PricingSnapshot[]> {
  const adminClient = createAdminClient()

  const { data: snapshots, error } = await adminClient
    .from('provider_price_snapshots')
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
    console.error('Error fetching pricing snapshots:', error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (snapshots || []).map((s: any) => ({
    id: s.id,
    provider_id: s.provider_id,
    snapshot_name: s.snapshot_name,
    snapshot_data: s.snapshot_data as PricingSnapshot['snapshot_data'],
    created_at: s.created_at,
    created_by: s.created_by,
    created_by_user: s.users ? { name: s.users.name, email: s.users.email } : null,
  }))
}

/**
 * Generate PDF data from a saved snapshot
 */
export async function getSnapshotPDFData(snapshotId: string): Promise<{
  error?: string
  data?: {
    provider: { name: string; nif: string | null; email: string }
    prices: ProposalPDFPrice[]
  }
}> {
  const adminClient = createAdminClient()

  const { data: snapshot, error } = await adminClient
    .from('provider_price_snapshots')
    .select('snapshot_data')
    .eq('id', snapshotId)
    .single()

  if (error || !snapshot) {
    return { error: 'Snapshot não encontrado' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snapshotData = snapshot.snapshot_data as any

  return {
    data: {
      provider: snapshotData.provider,
      prices: snapshotData.prices,
    },
  }
}
