'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface ServiceRequest {
  id: string
  request_code: string
  fid_id: string | null
  user_id: string | null
  client_town: string | null
  client_district: string | null
  cluster: string | null
  category: string | null
  service: string | null
  scheduled_to: string | null
  created_at: string
  service_address_line_1: string | null
  service_address_line_2: string | null
  zip_code: string | null
  city: string | null
  cost_estimation: number | null
  promocode: string | null
  final_cost_estimation: number | null
  net_amount: number | null
  payment_status: string | null
  payment_method: string | null
  paid_amount: number | null
  assigned_provider_id: string | null
  assigned_provider_name: string | null
  technician_name: string | null
  status: string
  status_updated_at: string | null
  source: string | null
  service_rating: number | null
  recurrence_type: string | null
}

export interface ServiceRequestFilters {
  status?: string
  category?: string
  district?: string
  provider?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ServiceRequestStats {
  total: number
  novoPedido: number
  atribuirPrestador: number
  prestadorAtribuido: number
  concluido: number
  cancelado: number
}

export interface PaginatedServiceRequests {
  data: ServiceRequest[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Get service requests with filters and pagination
export async function getServiceRequests(filters: ServiceRequestFilters = {}): Promise<PaginatedServiceRequests> {
  const supabase = createAdminClient()
  const page = filters.page || 1
  const limit = filters.limit || 100
  const from = (page - 1) * limit
  const to = from + limit - 1
  const sortBy = filters.sortBy || 'created_at'
  const sortOrder = filters.sortOrder || 'desc'

  // First get total count with filters
  let countQuery = supabase
    .from('service_requests')
    .select('*', { count: 'exact', head: true })

  // Apply same filters to count
  if (filters.status && filters.status !== 'all') {
    countQuery = countQuery.eq('status', filters.status)
  }

  if (filters.category && filters.category !== 'all') {
    countQuery = countQuery.eq('category', filters.category)
  }

  if (filters.district && filters.district !== 'all') {
    countQuery = countQuery.eq('client_district', filters.district)
  }

  if (filters.provider && filters.provider !== 'all') {
    countQuery = countQuery.eq('assigned_provider_name', filters.provider)
  }

  if (filters.search) {
    countQuery = countQuery.or(`request_code.ilike.%${filters.search}%,assigned_provider_name.ilike.%${filters.search}%,city.ilike.%${filters.search}%,service.ilike.%${filters.search}%`)
  }

  if (filters.dateFrom) {
    countQuery = countQuery.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    countQuery = countQuery.lte('created_at', filters.dateTo)
  }

  const { count } = await countQuery

  // Now get paginated data
  let query = supabase
    .from('service_requests')
    .select('*')
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  if (filters.district && filters.district !== 'all') {
    query = query.eq('client_district', filters.district)
  }

  if (filters.provider && filters.provider !== 'all') {
    query = query.eq('assigned_provider_name', filters.provider)
  }

  if (filters.search) {
    query = query.or(`request_code.ilike.%${filters.search}%,assigned_provider_name.ilike.%${filters.search}%,city.ilike.%${filters.search}%,service.ilike.%${filters.search}%`)
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching service requests:', error)
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    }
  }

  return {
    data: data as ServiceRequest[],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

// Get single service request by ID or request_code
export async function getServiceRequest(idOrCode: string) {
  const supabase = createAdminClient()

  // Check if it's a UUID or request_code
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode)

  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq(isUuid ? 'id' : 'request_code', idOrCode)
    .single()

  if (error) {
    console.error('Error fetching service request:', error)
    return null
  }

  return data
}

// Get stats for dashboard
export async function getServiceRequestStats(): Promise<ServiceRequestStats> {
  const supabase = createAdminClient()

  // Use count queries instead of fetching all data (Supabase default limit is 1000)
  const [
    totalResult,
    novoPedidoResult,
    atribuirPrestadorResult,
    prestadorAtribuidoResult,
    concluidoResult,
    canceladoResult,
  ] = await Promise.all([
    supabase.from('service_requests').select('*', { count: 'exact', head: true }),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'Novo pedido'),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'Atribuir prestador'),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'Prestador atribuído'),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'Concluído'),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).ilike('status', '%Cancelado%'),
  ])

  if (totalResult.error) {
    console.error('Error fetching stats:', totalResult.error)
    return {
      total: 0,
      novoPedido: 0,
      atribuirPrestador: 0,
      prestadorAtribuido: 0,
      concluido: 0,
      cancelado: 0,
    }
  }

  return {
    total: totalResult.count || 0,
    novoPedido: novoPedidoResult.count || 0,
    atribuirPrestador: atribuirPrestadorResult.count || 0,
    prestadorAtribuido: prestadorAtribuidoResult.count || 0,
    concluido: concluidoResult.count || 0,
    cancelado: canceladoResult.count || 0,
  }
}

// Get distinct values for filters
// Note: All these functions need .range() to bypass Supabase's default 1000 row limit
export async function getDistinctCategories(): Promise<string[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('service_requests')
    .select('category')
    .not('category', 'is', null)
    .range(0, 9999)

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  const unique = [...new Set(data.map(d => d.category).filter(Boolean))]
  return unique.sort() as string[]
}

export async function getDistinctDistricts(): Promise<string[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('service_requests')
    .select('client_district')
    .not('client_district', 'is', null)
    .range(0, 9999)

  if (error) {
    console.error('Error fetching districts:', error)
    return []
  }

  const unique = [...new Set(data.map(d => d.client_district).filter(Boolean))]
  return unique.sort() as string[]
}

export async function getDistinctProviders(): Promise<string[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('service_requests')
    .select('assigned_provider_name')
    .not('assigned_provider_name', 'is', null)
    .range(0, 9999)

  if (error) {
    console.error('Error fetching providers:', error)
    return []
  }

  const unique = [...new Set(data.map(d => d.assigned_provider_name).filter(Boolean))]
  return unique.sort() as string[]
}

export async function getDistinctStatuses(): Promise<string[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('service_requests')
    .select('status')
    .not('status', 'is', null)
    .range(0, 9999)

  if (error) {
    console.error('Error fetching statuses:', error)
    return []
  }

  const unique = [...new Set(data.map(d => d.status).filter(Boolean))]
  return unique.sort() as string[]
}

// Trigger data import
export async function importServiceRequests() {
  // This would trigger the import script
  // For now, we'll just revalidate the path
  revalidatePath('/pedidos')
  return { success: true }
}

// Data for map visualization
export interface MapServiceRequest {
  id: string
  request_code: string
  status: string
  category: string | null
  service: string | null
  city: string | null
  district: string | null
  assigned_provider_name: string | null
  created_at: string
  lat: number
  lng: number
}

// Get service requests with coordinates for map
export async function getServiceRequestsForMap(filters: ServiceRequestFilters = {}): Promise<MapServiceRequest[]> {
  const { getCoordinates, addJitter } = await import('@/lib/geo/portugal-coordinates')
  const supabase = createAdminClient()

  // Supabase/PostgREST has a hard limit of 1000 rows per request
  // We need to paginate to get all records
  const BATCH_SIZE = 1000
  const allData: any[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from('service_requests')
      .select('id, request_code, status, category, service, city, client_district, zip_code, assigned_provider_name, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1)

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters.district && filters.district !== 'all') {
      query = query.eq('client_district', filters.district)
    }

    if (filters.provider && filters.provider !== 'all') {
      query = query.eq('assigned_provider_name', filters.provider)
    }

    if (filters.search) {
      query = query.or(`request_code.ilike.%${filters.search}%,assigned_provider_name.ilike.%${filters.search}%,city.ilike.%${filters.search}%,service.ilike.%${filters.search}%`)
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching service requests for map:', error)
      break
    }

    if (data && data.length > 0) {
      allData.push(...data)
      offset += BATCH_SIZE
      // If we got less than BATCH_SIZE, we've reached the end
      hasMore = data.length === BATCH_SIZE
    } else {
      hasMore = false
    }
  }

  // Transform data with coordinates
  const mapData: MapServiceRequest[] = []

  for (const request of allData) {
    const coords = getCoordinates(request.city, request.client_district, request.zip_code)
    if (coords) {
      // Add small jitter to avoid overlapping pins
      const jitteredCoords = addJitter(coords)
      mapData.push({
        id: request.id,
        request_code: request.request_code,
        status: request.status,
        category: request.category,
        service: request.service,
        city: request.city,
        district: request.client_district,
        assigned_provider_name: request.assigned_provider_name,
        created_at: request.created_at,
        lat: jitteredCoords.lat,
        lng: jitteredCoords.lng,
      })
    }
  }

  return mapData
}

// Filters for provider-specific service requests (excludes 'provider' filter since it's implicit)
export interface ProviderServiceRequestFilters {
  status?: string
  category?: string
  district?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Get service requests for a specific provider by backoffice_provider_id
export async function getProviderServiceRequests(
  backofficeProviderId: number,
  filters: ProviderServiceRequestFilters = {}
): Promise<PaginatedServiceRequests> {
  const supabase = createAdminClient()
  const page = filters.page || 1
  const limit = filters.limit || 25
  const from = (page - 1) * limit
  const to = from + limit - 1
  const sortBy = filters.sortBy || 'created_at'
  const sortOrder = filters.sortOrder || 'desc'

  // The assigned_provider_id is stored as string in service_requests
  const providerIdString = String(backofficeProviderId)

  // First get total count with filters
  let countQuery = supabase
    .from('service_requests')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_provider_id', providerIdString)

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    countQuery = countQuery.eq('status', filters.status)
  }

  if (filters.category && filters.category !== 'all') {
    countQuery = countQuery.eq('category', filters.category)
  }

  if (filters.district && filters.district !== 'all') {
    countQuery = countQuery.eq('client_district', filters.district)
  }

  if (filters.search) {
    countQuery = countQuery.or(`request_code.ilike.%${filters.search}%,city.ilike.%${filters.search}%,service.ilike.%${filters.search}%`)
  }

  if (filters.dateFrom) {
    countQuery = countQuery.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    countQuery = countQuery.lte('created_at', filters.dateTo)
  }

  const { count } = await countQuery

  // Now get paginated data
  let query = supabase
    .from('service_requests')
    .select('*')
    .eq('assigned_provider_id', providerIdString)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  if (filters.district && filters.district !== 'all') {
    query = query.eq('client_district', filters.district)
  }

  if (filters.search) {
    query = query.or(`request_code.ilike.%${filters.search}%,city.ilike.%${filters.search}%,service.ilike.%${filters.search}%`)
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching provider service requests:', error)
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    }
  }

  return {
    data: data as ServiceRequest[],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  }
}
