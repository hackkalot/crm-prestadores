'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type ServicePrice = Database['public']['Tables']['service_prices']['Row']
type ProviderCustomPrice = Database['public']['Tables']['provider_custom_prices']['Row']

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
  custom_price?: number | null // Custom price if exists
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
  const { data: customPrices, error: customError } = await supabase
    .from('provider_custom_prices')
    .select('*')
    .eq('provider_id', providerId)

  if (customError) {
    console.error('Error fetching custom prices:', customError)
  }

  // Create a map of reference_price_id -> custom_price
  const customPriceMap = new Map<string, number>()
  if (customPrices) {
    for (const price of customPrices) {
      customPriceMap.set(price.reference_price_id, price.custom_price_without_vat)
    }
  }

  // Merge reference prices with custom prices
  const servicesWithPrices: PricingService[] = referencePrices.map((refPrice) => ({
    ...refPrice,
    custom_price: customPriceMap.get(refPrice.id) ?? null,
  }))

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
 * Update or delete custom price for a service
 * - If customPrice is provided: create or update the record
 * - If customPrice is null: delete the record (use reference price)
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

  // Check if custom price record exists
  const { data: existing } = await adminClient
    .from('provider_custom_prices')
    .select('id, custom_price_without_vat')
    .eq('provider_id', providerId)
    .eq('reference_price_id', referencePriceId)
    .single()

  const oldPrice = existing?.custom_price_without_vat ?? null

  if (customPrice === null) {
    // Delete the record if it exists (revert to reference price)
    if (existing) {
      const { error } = await adminClient
        .from('provider_custom_prices')
        .delete()
        .eq('id', existing.id)

      if (error) {
        console.error('Error deleting custom price:', error)
        return { error: 'Erro ao remover preço personalizado' }
      }

      // Log the removal
      await logPriceChange(
        adminClient,
        providerId,
        user.id,
        'price_change',
        `Preço personalizado de "${serviceName}" removido (revertido para referência ${servicePrice?.price_base}€)`,
        { service: serviceName, custom_price: oldPrice },
        { service: serviceName, custom_price: null, reference_price: servicePrice?.price_base }
      )
    }
  } else if (existing) {
    // Update existing record
    const { error } = await adminClient
      .from('provider_custom_prices')
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
      `Preço personalizado de "${serviceName}" alterado de ${oldPrice}€ para ${customPrice}€`,
      { service: serviceName, custom_price: oldPrice, reference_price: servicePrice?.price_base },
      { service: serviceName, custom_price: customPrice, reference_price: servicePrice?.price_base }
    )
  } else {
    // Create new record
    const { error } = await adminClient.from('provider_custom_prices').insert({
      provider_id: providerId,
      reference_price_id: referencePriceId,
      custom_price_without_vat: customPrice,
      created_by: user.id,
      updated_by: user.id,
    })

    if (error) {
      console.error('Error creating custom price:', error)
      return { error: 'Erro ao criar preço personalizado' }
    }

    // Log new custom price
    await logPriceChange(
      adminClient,
      providerId,
      user.id,
      'price_change',
      `Preço personalizado de "${serviceName}" definido como ${customPrice}€ (referência: ${servicePrice?.price_base}€)`,
      null,
      { service: serviceName, custom_price: customPrice, reference_price: servicePrice?.price_base }
    )
  }

  revalidatePath(`/providers/${providerId}`)
  return {}
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

// Tipo para materiais
export type ProposalMaterial = {
  id: string
  material_name: string
  category: string | null
  price_without_vat: number
  vat_rate: number
  is_active: boolean | null
}

/**
 * Generate PDF data for selected services
 * Selection is now passed from client state, not from DB
 */
export async function generateProposalPDFData(
  providerId: string,
  selectedServiceIds: string[]
): Promise<{
  error?: string
  data?: {
    provider: {
      name: string
      nif: string | null
      email: string
    }
    prices: ProposalPDFPrice[]
    materials?: ProposalMaterial[]
  }
}> {
  const supabase = createAdminClient()

  if (selectedServiceIds.length === 0) {
    return { error: 'Nenhum serviço selecionado para gerar PDF' }
  }

  // Get provider info
  const { data: provider, error: provError } = await supabase
    .from('providers')
    .select('id, name, nif, email')
    .eq('id', providerId)
    .single()

  if (provError || !provider) {
    return { error: 'Prestador não encontrado' }
  }

  // Get selected reference prices with all fields
  const { data: referencePrices, error: refError } = await supabase
    .from('service_prices')
    .select('*')
    .in('id', selectedServiceIds)

  if (refError || !referencePrices) {
    console.error('Error fetching reference prices:', refError)
    return { error: 'Erro ao buscar preços de referência' }
  }

  // Get custom prices for selected services
  const { data: customPrices } = await supabase
    .from('provider_custom_prices')
    .select('reference_price_id, custom_price_without_vat')
    .eq('provider_id', providerId)
    .in('reference_price_id', selectedServiceIds)

  // Create map of custom prices
  const customPriceMap = new Map<string, number>()
  if (customPrices) {
    for (const cp of customPrices) {
      customPriceMap.set(cp.reference_price_id, cp.custom_price_without_vat)
    }
  }

  // Transform to ProposalPDFPrice format, applying custom prices where set
  const prices: ProposalPDFPrice[] = referencePrices.map((refPrice) => {
    // Apply custom price to price_base if set
    const customPrice = customPriceMap.get(refPrice.id)
    const finalPriceBase = customPrice ?? refPrice.price_base

    return {
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
    }
  })

  // Check if any selected service is a Canalizador service (by service_group)
  const hasCanalizador = referencePrices.some(
    (p) => p.service_group?.toLowerCase().includes('canalizador') ||
           p.service_name?.toLowerCase().includes('canalizador')
  )

  // Fetch materials if Canalizador is selected
  let materials: ProposalMaterial[] | undefined
  if (hasCanalizador) {
    const { data: materialsData } = await supabase
      .from('material_catalog')
      .select('id, material_name, category, price_without_vat, vat_rate, is_active')
      .eq('is_active', true)
      .order('material_name')

    if (materialsData && materialsData.length > 0) {
      materials = materialsData
    }
  }

  return {
    data: {
      provider: {
        name: provider.name,
        nif: provider.nif,
        email: provider.email || '',
      },
      prices,
      materials,
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
