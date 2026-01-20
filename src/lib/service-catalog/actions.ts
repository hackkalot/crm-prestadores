'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type CatalogPrice = {
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

export type CatalogMaterial = {
  id: string
  material_name: string
  category: string | null
  price_without_vat: number
  vat_rate: number
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export type CatalogStats = {
  totalPrices: number
  totalMaterials: number
  clusters: { cluster: string; count: number }[]
  lastUpdated: string | null
}

// Obter estatísticas gerais
export async function getCatalogStats(): Promise<CatalogStats> {
  const supabase = createAdminClient()

  // Total de preços
  const { count: totalPrices } = await supabase
    .from('service_prices')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Total de materiais
  const { count: totalMaterials } = await supabase
    .from('material_catalog')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Contagem por cluster
  const { data: clusterData } = await supabase
    .from('service_prices')
    .select('cluster')
    .eq('is_active', true)

  const clusterCounts = new Map<string, number>()
  for (const item of clusterData || []) {
    const count = clusterCounts.get(item.cluster) || 0
    clusterCounts.set(item.cluster, count + 1)
  }

  const clusters = Array.from(clusterCounts.entries())
    .map(([cluster, count]) => ({ cluster, count }))
    .sort((a, b) => b.count - a.count)

  // Última atualização
  const { data: lastUpdatedData } = await supabase
    .from('service_prices')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  return {
    totalPrices: totalPrices || 0,
    totalMaterials: totalMaterials || 0,
    clusters,
    lastUpdated: lastUpdatedData?.updated_at || null,
  }
}

// Obter preços com paginação e filtros
export async function getCatalogPrices(params: {
  cluster?: string
  serviceGroup?: string
  search?: string
  page?: number
  limit?: number
}): Promise<{ data: CatalogPrice[]; total: number }> {
  const { cluster, serviceGroup, search, page = 1, limit = 50 } = params
  const offset = (page - 1) * limit

  let query = createAdminClient()
    .from('service_prices')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('service_name')
    .order('unit_description')

  if (cluster) {
    query = query.eq('cluster', cluster)
  }

  if (serviceGroup) {
    query = query.eq('service_group', serviceGroup)
  }

  if (search) {
    query = query.or(`service_name.ilike.%${search}%,unit_description.ilike.%${search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching catalog prices:', error)
    return { data: [], total: 0 }
  }

  return {
    data: data || [],
    total: count || 0,
  }
}

// Obter materiais
export async function getCatalogMaterials(): Promise<CatalogMaterial[]> {
  const { data, error } = await createAdminClient()
    .from('material_catalog')
    .select('*')
    .eq('is_active', true)
    .order('material_name')

  if (error) {
    console.error('Error fetching catalog materials:', error)
    return []
  }

  return data || []
}

// Obter clusters únicos
export async function getCatalogClusters(): Promise<string[]> {
  const { data } = await createAdminClient()
    .from('service_prices')
    .select('cluster')
    .eq('is_active', true)

  const clusters = new Set<string>()
  for (const item of data || []) {
    clusters.add(item.cluster)
  }

  return Array.from(clusters).sort()
}

// Obter grupos de serviço únicos
export async function getCatalogServiceGroups(cluster?: string): Promise<string[]> {
  let query = createAdminClient()
    .from('service_prices')
    .select('service_group')
    .eq('is_active', true)
    .not('service_group', 'is', null)

  if (cluster) {
    query = query.eq('cluster', cluster)
  }

  const { data } = await query

  const groups = new Set<string>()
  for (const item of data || []) {
    if (item.service_group) {
      groups.add(item.service_group)
    }
  }

  return Array.from(groups).sort()
}

// Revalidar página após import
export async function revalidateCatalogPage() {
  revalidatePath('/configuracoes')
}
