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

// Tipo para criar/atualizar preço
export type CatalogPriceInput = Omit<CatalogPrice, 'id' | 'created_at' | 'updated_at'>

// Criar novo preço no catálogo
export async function createCatalogPrice(
  data: CatalogPriceInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient()

  // Verificar se já existe um serviço com a mesma combinação
  const typologyValue = data.typology || ''
  const { data: existing } = await supabase
    .from('service_prices')
    .select('id')
    .eq('service_name', data.service_name)
    .eq('unit_description', data.unit_description)
    .or(`typology.eq.${typologyValue},typology.is.null`)
    .eq('is_active', true)
    .limit(1)

  if (existing && existing.length > 0) {
    return {
      success: false,
      error: `Já existe um serviço "${data.service_name}" com a mesma unidade "${data.unit_description}"${data.typology ? ` e tipologia "${data.typology}"` : ''}. A combinação de serviço + unidade + tipologia deve ser única.`,
    }
  }

  const { data: result, error } = await supabase
    .from('service_prices')
    .insert({
      ...data,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating catalog price:', error)
    // Mensagem mais amigável para erro de duplicado
    if (error.message.includes('unique') || error.code === '23505') {
      return {
        success: false,
        error: `Já existe um serviço "${data.service_name}" com a mesma unidade "${data.unit_description}". A combinação de serviço + unidade + tipologia deve ser única.`,
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/configuracoes')
  return { success: true, id: result.id }
}

// Atualizar preço existente no catálogo
export async function updateCatalogPrice(
  id: string,
  data: Partial<CatalogPriceInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('service_prices')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating catalog price:', error)
    // Mensagem mais amigável para erro de duplicado
    if (error.message.includes('unique') || error.code === '23505') {
      return {
        success: false,
        error: `Já existe um serviço com a mesma combinação de nome, unidade e tipologia. A combinação deve ser única.`,
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/configuracoes')
  return { success: true }
}

// Eliminar (soft delete) preço do catálogo
export async function deleteCatalogPrice(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('service_prices')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error deleting catalog price:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/configuracoes')
  return { success: true }
}

// Obter sugestões de service_name (fuzzy)
export async function getServiceNameSuggestions(search: string): Promise<string[]> {
  if (!search || search.length < 2) return []

  const { data } = await createAdminClient()
    .from('service_prices')
    .select('service_name')
    .eq('is_active', true)
    .ilike('service_name', `%${search}%`)
    .limit(10)

  const names = new Set<string>()
  for (const item of data || []) {
    names.add(item.service_name)
  }

  return Array.from(names).sort()
}

// Obter sugestões de unit_description (fuzzy)
export async function getUnitDescriptionSuggestions(search: string): Promise<string[]> {
  if (!search || search.length < 2) return []

  const { data } = await createAdminClient()
    .from('service_prices')
    .select('unit_description')
    .eq('is_active', true)
    .ilike('unit_description', `%${search}%`)
    .limit(10)

  const descriptions = new Set<string>()
  for (const item of data || []) {
    descriptions.add(item.unit_description)
  }

  return Array.from(descriptions).sort()
}

// Obter todos os preços para export (sem paginação, respeitando filtros)
export async function getCatalogPricesForExport(params: {
  cluster?: string
  serviceGroup?: string
  search?: string
}): Promise<CatalogPrice[]> {
  const { cluster, serviceGroup, search } = params

  let query = createAdminClient()
    .from('service_prices')
    .select('*')
    .eq('is_active', true)
    .order('cluster')
    .order('service_group')
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

  const { data, error } = await query

  if (error) {
    console.error('Error fetching catalog prices for export:', error)
    return []
  }

  return data || []
}

// ============================================
// MATERIAL CATALOG CRUD
// ============================================

// Tipo para criar/atualizar material
export type CatalogMaterialInput = Omit<CatalogMaterial, 'id' | 'created_at' | 'updated_at'>

// Obter materiais com paginação e filtros
export async function getCatalogMaterialsWithPagination(params: {
  category?: string
  search?: string
  page?: number
  limit?: number
}): Promise<{ data: CatalogMaterial[]; total: number }> {
  const { category, search, page = 1, limit = 50 } = params
  const offset = (page - 1) * limit

  let query = createAdminClient()
    .from('material_catalog')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('material_name')

  if (category) {
    query = query.eq('category', category)
  }

  if (search) {
    query = query.ilike('material_name', `%${search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching catalog materials:', error)
    return { data: [], total: 0 }
  }

  return {
    data: data || [],
    total: count || 0,
  }
}

// Obter categorias únicas de materiais
export async function getCatalogMaterialCategories(): Promise<string[]> {
  const { data } = await createAdminClient()
    .from('material_catalog')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null)

  const categories = new Set<string>()
  for (const item of data || []) {
    if (item.category) {
      categories.add(item.category)
    }
  }

  return Array.from(categories).sort()
}

// Criar novo material no catálogo
export async function createCatalogMaterial(
  data: CatalogMaterialInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient()

  // Verificar se já existe um material com o mesmo nome
  const { data: existing } = await supabase
    .from('material_catalog')
    .select('id')
    .eq('material_name', data.material_name)
    .eq('is_active', true)
    .limit(1)

  if (existing && existing.length > 0) {
    return {
      success: false,
      error: `Já existe um material "${data.material_name}". O nome do material deve ser único.`,
    }
  }

  const { data: result, error } = await supabase
    .from('material_catalog')
    .insert({
      ...data,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating catalog material:', error)
    if (error.message.includes('unique') || error.code === '23505') {
      return {
        success: false,
        error: `Já existe um material "${data.material_name}". O nome do material deve ser único.`,
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/configuracoes')
  return { success: true, id: result.id }
}

// Atualizar material existente no catálogo
export async function updateCatalogMaterial(
  id: string,
  data: Partial<CatalogMaterialInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('material_catalog')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating catalog material:', error)
    if (error.message.includes('unique') || error.code === '23505') {
      return {
        success: false,
        error: `Já existe um material com o mesmo nome. O nome deve ser único.`,
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/configuracoes')
  return { success: true }
}

// Eliminar (soft delete) material do catálogo
export async function deleteCatalogMaterial(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('material_catalog')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error deleting catalog material:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/configuracoes')
  return { success: true }
}

// Obter sugestões de categoria de material (fuzzy)
export async function getMaterialCategorySuggestions(search: string): Promise<string[]> {
  if (!search || search.length < 1) return []

  const { data } = await createAdminClient()
    .from('material_catalog')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null)
    .ilike('category', `%${search}%`)
    .limit(10)

  const categories = new Set<string>()
  for (const item of data || []) {
    if (item.category) {
      categories.add(item.category)
    }
  }

  return Array.from(categories).sort()
}

// Obter todos os materiais para export (sem paginação, respeitando filtros)
export async function getCatalogMaterialsForExport(params: {
  category?: string
  search?: string
}): Promise<CatalogMaterial[]> {
  const { category, search } = params

  let query = createAdminClient()
    .from('material_catalog')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('material_name')

  if (category) {
    query = query.eq('category', category)
  }

  if (search) {
    query = query.ilike('material_name', `%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching catalog materials for export:', error)
    return []
  }

  return data || []
}
