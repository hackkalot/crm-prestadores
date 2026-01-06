'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Tipos
export type ServiceCategory = {
  id: string
  name: string
  cluster: string | null
  vat_rate: number
  is_active: boolean
}

export type Service = {
  id: string
  name: string
  description: string | null
  unit: string | null
  is_active: boolean
  category: ServiceCategory
}

export type ReferencePrice = {
  id: string
  service_id: string
  variant_name: string | null
  variant_description: string | null
  price_without_vat: number
  valid_from: string
  is_active: boolean
}

export type ProviderPrice = {
  id: string
  provider_id: string
  service_id: string
  variant_name: string | null
  price_without_vat: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  service?: Service
  reference_price?: ReferencePrice | null
}

export type ServiceWithPrices = Service & {
  reference_prices: ReferencePrice[]
  provider_prices: ProviderPrice[]
}

// Obter categorias de servicos
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('service_categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching service categories:', error)
    return []
  }

  return data || []
}

// Obter servicos com precos de referencia
export async function getServicesWithReferencePrices(): Promise<ServiceWithPrices[]> {
  // Obter servicos com categorias
  const { data: services, error: servicesError } = await getSupabaseAdmin()
    .from('services')
    .select(`
      id,
      name,
      description,
      unit,
      is_active,
      category:service_categories(id, name, cluster, vat_rate, is_active)
    `)
    .eq('is_active', true)
    .order('name')

  if (servicesError || !services) {
    console.error('Error fetching services:', servicesError)
    return []
  }

  // Obter precos de referencia ativos
  const { data: refPrices, error: refPricesError } = await getSupabaseAdmin()
    .from('reference_prices')
    .select('*')
    .eq('is_active', true)

  if (refPricesError) {
    console.error('Error fetching reference prices:', refPricesError)
  }

  // Combinar dados
  return services.map((service) => ({
    ...service,
    category: Array.isArray(service.category) ? service.category[0] : service.category,
    reference_prices: (refPrices || []).filter((rp) => rp.service_id === service.id),
    provider_prices: [],
  })) as ServiceWithPrices[]
}

// Obter precos de um prestador
export async function getProviderPrices(providerId: string): Promise<ProviderPrice[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('provider_prices')
    .select(`
      *,
      service:services(
        id,
        name,
        description,
        unit,
        is_active,
        category:service_categories(id, name, cluster, vat_rate, is_active)
      )
    `)
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching provider prices:', error)
    return []
  }

  // Processar relacoes
  return (data || []).map((price) => ({
    ...price,
    service: Array.isArray(price.service) ? price.service[0] : price.service,
  }))
}

// Obter tabela de precos completa de um prestador
export async function getProviderPricingTable(providerId: string) {
  // Obter servicos com precos de referencia
  const services = await getServicesWithReferencePrices()

  // Obter precos do prestador
  const providerPrices = await getProviderPrices(providerId)

  // Combinar dados
  const pricingTable = services.map((service) => {
    const serviceProviderPrices = providerPrices.filter(
      (pp) => pp.service_id === service.id
    )

    return {
      ...service,
      provider_prices: serviceProviderPrices,
    }
  })

  // Agrupar por categoria
  const categories = new Map<string, { category: ServiceCategory; services: typeof pricingTable }>()

  for (const service of pricingTable) {
    const catId = service.category?.id || 'uncategorized'
    if (!categories.has(catId)) {
      categories.set(catId, {
        category: service.category || { id: 'uncategorized', name: 'Sem Categoria', cluster: null, vat_rate: 23, is_active: true },
        services: [],
      })
    }
    categories.get(catId)!.services.push(service)
  }

  return Array.from(categories.values())
}

// Definir preco para um prestador
export async function setProviderPrice(
  providerId: string,
  serviceId: string,
  priceWithoutVat: number,
  variantName?: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Desativar preco anterior para o mesmo servico/variante
  await getSupabaseAdmin()
    .from('provider_prices')
    .update({
      is_active: false,
      valid_until: new Date().toISOString(),
    })
    .eq('provider_id', providerId)
    .eq('service_id', serviceId)
    .eq('is_active', true)
    .eq('variant_name', variantName || null)

  // Criar novo preco
  const { data, error } = await getSupabaseAdmin()
    .from('provider_prices')
    .insert({
      provider_id: providerId,
      service_id: serviceId,
      variant_name: variantName || null,
      price_without_vat: priceWithoutVat,
      valid_from: new Date().toISOString(),
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error setting provider price:', error)
    throw new Error('Failed to set price')
  }

  // Registar no historico
  await getSupabaseAdmin().from('history_log').insert({
    provider_id: providerId,
    event_type: 'price_change',
    description: `Preco atualizado para servico`,
    old_value: null,
    new_value: { price: priceWithoutVat, service_id: serviceId, variant: variantName },
    created_by: user.id,
  })

  revalidatePath(`/prestadores/${providerId}`)
  return data
}

// Definir precos em lote para um prestador
export async function setProviderPricesBatch(
  providerId: string,
  prices: Array<{
    serviceId: string
    priceWithoutVat: number
    variantName?: string | null
  }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Desativar precos anteriores
  const serviceIds = prices.map((p) => p.serviceId)
  await getSupabaseAdmin()
    .from('provider_prices')
    .update({
      is_active: false,
      valid_until: new Date().toISOString(),
    })
    .eq('provider_id', providerId)
    .in('service_id', serviceIds)
    .eq('is_active', true)

  // Criar novos precos
  const newPrices = prices.map((p) => ({
    provider_id: providerId,
    service_id: p.serviceId,
    variant_name: p.variantName || null,
    price_without_vat: p.priceWithoutVat,
    valid_from: new Date().toISOString(),
    is_active: true,
  }))

  const { error } = await getSupabaseAdmin()
    .from('provider_prices')
    .insert(newPrices)

  if (error) {
    console.error('Error setting provider prices batch:', error)
    throw new Error('Failed to set prices')
  }

  // Registar no historico
  await getSupabaseAdmin().from('history_log').insert({
    provider_id: providerId,
    event_type: 'price_change',
    description: `${prices.length} precos atualizados`,
    new_value: { count: prices.length },
    created_by: user.id,
  })

  revalidatePath(`/prestadores/${providerId}`)
  return { success: true }
}

// Criar snapshot da tabela de precos
export async function createPriceSnapshot(providerId: string, snapshotName?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Obter precos atuais
  const providerPrices = await getProviderPrices(providerId)

  const { data, error } = await getSupabaseAdmin()
    .from('provider_price_snapshots')
    .insert({
      provider_id: providerId,
      snapshot_name: snapshotName || `Snapshot ${new Date().toLocaleDateString('pt-PT')}`,
      snapshot_data: providerPrices,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating price snapshot:', error)
    throw new Error('Failed to create snapshot')
  }

  revalidatePath(`/prestadores/${providerId}`)
  return data
}

// Obter snapshots de precos
export async function getPriceSnapshots(providerId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('provider_price_snapshots')
    .select(`
      *,
      created_by_user:users(name)
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching price snapshots:', error)
    return []
  }

  return (data || []).map((snapshot) => ({
    ...snapshot,
    created_by_user: Array.isArray(snapshot.created_by_user)
      ? snapshot.created_by_user[0]
      : snapshot.created_by_user,
  }))
}

// Gerar proposta inicial de precos baseada nos precos de referencia
export async function generateInitialPriceProposal(providerId: string): Promise<{
  success: boolean
  pricesCreated: number
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, pricesCreated: 0, error: 'Nao autenticado' }

  // Verificar se prestador ja tem precos
  const { data: existingPrices } = await getSupabaseAdmin()
    .from('provider_prices')
    .select('id')
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .limit(1)

  if (existingPrices && existingPrices.length > 0) {
    return {
      success: false,
      pricesCreated: 0,
      error: 'Prestador ja tem precos definidos. Elimine os precos existentes para gerar nova proposta.',
    }
  }

  // Obter precos de referencia ativos
  const { data: refPrices, error: refError } = await getSupabaseAdmin()
    .from('reference_prices')
    .select(`
      id,
      service_id,
      variant_name,
      variant_description,
      price_without_vat
    `)
    .eq('is_active', true)

  if (refError || !refPrices || refPrices.length === 0) {
    return {
      success: false,
      pricesCreated: 0,
      error: 'Nao foram encontrados precos de referencia',
    }
  }

  // Criar precos para o prestador baseados nos precos de referencia
  const newPrices = refPrices.map((rp) => ({
    provider_id: providerId,
    service_id: rp.service_id,
    variant_name: rp.variant_name,
    price_without_vat: rp.price_without_vat, // Preco igual ao de referencia
    valid_from: new Date().toISOString(),
    is_active: true,
  }))

  const { error: insertError } = await getSupabaseAdmin()
    .from('provider_prices')
    .insert(newPrices)

  if (insertError) {
    console.error('Error creating initial prices:', insertError)
    return {
      success: false,
      pricesCreated: 0,
      error: 'Erro ao criar precos iniciais',
    }
  }

  // Registar no historico
  await getSupabaseAdmin().from('history_log').insert({
    provider_id: providerId,
    event_type: 'price_change',
    description: `Proposta inicial de precos gerada (${newPrices.length} precos)`,
    new_value: { count: newPrices.length, source: 'auto_proposal' },
    created_by: user.id,
  })

  revalidatePath(`/prestadores/${providerId}`)
  return { success: true, pricesCreated: newPrices.length }
}

// Verificar se prestador tem precos definidos
export async function hasProviderPrices(providerId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('provider_prices')
    .select('id')
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .limit(1)

  return (data && data.length > 0) || false
}

// Obter dados para exportacao de precario
export async function getPricingExportData(providerId: string) {
  // Obter dados do prestador
  const { data: provider, error: providerError } = await getSupabaseAdmin()
    .from('providers')
    .select('id, name, nif, email, phone, entity_type')
    .eq('id', providerId)
    .single()

  if (providerError || !provider) {
    console.error('Error fetching provider:', providerError)
    return null
  }

  // Obter tabela de precos
  const pricingTable = await getProviderPricingTable(providerId)

  // Preparar dados para exportacao
  const exportData = {
    provider: {
      name: provider.name,
      nif: provider.nif,
      email: provider.email,
      phone: provider.phone,
      entityType: provider.entity_type,
    },
    generatedAt: new Date().toISOString(),
    categories: pricingTable.map(({ category, services }) => ({
      name: category.name,
      cluster: category.cluster,
      vatRate: category.vat_rate,
      services: services.map((service) => {
        const prices = service.reference_prices.map((refPrice) => {
          const providerPrice = service.provider_prices.find(
            (pp) => pp.variant_name === refPrice.variant_name
          )
          return {
            serviceName: service.name,
            variantName: refPrice.variant_name,
            variantDescription: refPrice.variant_description,
            referencePrice: refPrice.price_without_vat,
            providerPrice: providerPrice?.price_without_vat || null,
            unit: service.unit,
          }
        })
        return prices
      }).flat(),
    })),
    totals: {
      totalServices: pricingTable.reduce((acc, cat) => acc + cat.services.length, 0),
      totalWithPrices: pricingTable.reduce(
        (acc, cat) => acc + cat.services.filter((s) => s.provider_prices.length > 0).length,
        0
      ),
    },
  }

  return exportData
}

// Calcular desvio de precos
export async function calculatePriceDeviations(providerId: string) {
  const providerPrices = await getProviderPrices(providerId)

  // Obter precos de referencia
  const { data: refPrices } = await getSupabaseAdmin()
    .from('reference_prices')
    .select('*')
    .eq('is_active', true)

  if (!refPrices) return []

  const deviations: Array<{
    serviceId: string
    serviceName: string
    variantName: string | null
    providerPrice: number
    referencePrice: number
    deviation: number // percentagem
    deviationAmount: number // valor absoluto
  }> = []

  for (const pp of providerPrices) {
    const refPrice = refPrices.find(
      (rp) => rp.service_id === pp.service_id && rp.variant_name === pp.variant_name
    )

    if (refPrice) {
      const deviation = ((pp.price_without_vat - refPrice.price_without_vat) / refPrice.price_without_vat) * 100
      const deviationAmount = pp.price_without_vat - refPrice.price_without_vat

      deviations.push({
        serviceId: pp.service_id,
        serviceName: pp.service?.name || 'Desconhecido',
        variantName: pp.variant_name,
        providerPrice: pp.price_without_vat,
        referencePrice: refPrice.price_without_vat,
        deviation: Math.round(deviation * 10) / 10,
        deviationAmount: Math.round(deviationAmount * 100) / 100,
      })
    }
  }

  return deviations.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
}
