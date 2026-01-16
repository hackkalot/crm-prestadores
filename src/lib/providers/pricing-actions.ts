'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type AngariacaoReferencePrice = Database['public']['Tables']['angariacao_reference_prices']['Row']
type ProviderPrice = Database['public']['Tables']['provider_prices']['Row']

export type PricingService = AngariacaoReferencePrice & {
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
 * Get all angariacao reference prices grouped by cluster with provider's custom prices
 */
export async function getProviderPricingOptions(providerId: string): Promise<PricingCluster[]> {
  const supabase = createAdminClient()

  // Get all active reference prices
  const { data: referencePrices, error: refError } = await supabase
    .from('angariacao_reference_prices')
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

  // Check if provider_price record exists
  const { data: existing } = await adminClient
    .from('provider_prices')
    .select('id')
    .eq('provider_id', providerId)
    .eq('reference_price_id', referencePriceId)
    .single()

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
  } else {
    // Create new record
    const { error } = await adminClient.from('provider_prices').insert({
      provider_id: providerId,
      reference_price_id: referencePriceId,
      is_selected_for_proposal: isSelected,
      created_by: user.id,
      updated_by: user.id,
    })

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

  // Check if provider_price record exists
  const { data: existing } = await adminClient
    .from('provider_prices')
    .select('id')
    .eq('provider_id', providerId)
    .eq('reference_price_id', referencePriceId)
    .single()

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
  } else {
    // Create new record
    const { error } = await adminClient.from('provider_prices').insert({
      provider_id: providerId,
      reference_price_id: referencePriceId,
      custom_price_without_vat: customPrice,
      created_by: user.id,
      updated_by: user.id,
    })

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

  revalidatePath(`/providers/${providerId}`)
  return {}
}
