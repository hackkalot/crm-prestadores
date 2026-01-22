import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFullySelectedDistricts } from '@/lib/data/portugal-districts'
import { bulkResolveServiceNames } from '@/lib/providers/actions'

// Get providers with service requests (for hasPedidos filter)
async function getProvidersWithServiceRequests(): Promise<number[]> {
  const { data, error } = await createAdminClient()
    .from('service_requests')
    .select('assigned_provider_id')
    .not('assigned_provider_id', 'is', null)

  if (error || !data) return []

  // assigned_provider_id is a string in the database, convert to number
  const uniqueIds = new Set(
    data
      .map((r) => r.assigned_provider_id ? parseInt(r.assigned_provider_id, 10) : null)
      .filter((id): id is number => id !== null && !isNaN(id))
  )
  return Array.from(uniqueIds)
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams

  // Parse filters from query params
  const status = searchParams.get('status') || '_all'
  const entityType = searchParams.get('entityType')
  const counties = searchParams.get('counties')?.split(',').filter(Boolean)
  const services = searchParams.get('services')?.split(',').filter(Boolean)
  const ownerId = searchParams.get('ownerId')
  const hasPedidos = searchParams.get('hasPedidos') as 'all' | 'with' | 'without' | null
  const sortBy = searchParams.get('sortBy') || 'name'
  const sortOrder = searchParams.get('sortOrder') || 'asc'
  const ascending = sortOrder === 'asc'

  // Get providers with service requests if filtering by hasPedidos
  let providersWithRequests: Set<number> | null = null
  if (hasPedidos === 'with' || hasPedidos === 'without') {
    const idsWithRequests = await getProvidersWithServiceRequests()
    providersWithRequests = new Set(idsWithRequests)
  }

  // Build query
  let query = createAdminClient()
    .from('providers')
    .select(`
      *,
      relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email)
    `)
    .order(sortBy, { ascending })

  // Apply status filter
  if (!status || status === '_all') {
    // Default: show ALL statuses (no filter applied)
  } else if (status === 'all') {
    // Show active network (ativo + suspenso)
    query = query.in('status', ['ativo', 'suspenso'])
  } else {
    // Specific status selected
    query = query.eq('status', status)
  }

  // Entity type filter
  if (entityType && entityType !== '_all') {
    query = query.eq('entity_type', entityType)
  }

  // Owner filter
  if (ownerId && ownerId !== '_all') {
    query = query.eq('relationship_owner_id', ownerId)
  }

  // Counties filter
  if (counties && counties.length > 0) {
    const fullySelectedDistricts = getFullySelectedDistricts(counties)
    if (fullySelectedDistricts.length > 0) {
      query = query.or(`counties.ov.{${counties.join(',')}},districts.ov.{${fullySelectedDistricts.join(',')}}`)
    } else {
      query = query.overlaps('counties', counties)
    }
  }

  // Services filter
  if (services && services.length > 0) {
    query = query.overlaps('services', services)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar prestadores:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }

  // Apply hasPedidos filter in-memory (requires cross-referencing)
  let filteredData = data || []
  if (providersWithRequests !== null) {
    if (hasPedidos === 'with') {
      filteredData = filteredData.filter(p =>
        p.backoffice_provider_id !== null && providersWithRequests!.has(p.backoffice_provider_id)
      )
    } else if (hasPedidos === 'without') {
      filteredData = filteredData.filter(p =>
        p.backoffice_provider_id === null || !providersWithRequests!.has(p.backoffice_provider_id)
      )
    }
  }

  // Resolve service names (UUIDs to names)
  const serviceNamesMap = await bulkResolveServiceNames(
    filteredData.map(p => ({ id: p.id, services: p.services }))
  )

  // Replace services with resolved names
  const dataWithResolvedServices = filteredData.map(p => ({
    ...p,
    services: serviceNamesMap.get(p.id) || p.services || [],
  }))

  return NextResponse.json({
    data: dataWithResolvedServices,
    total: dataWithResolvedServices.length,
    page: 1,
    limit: dataWithResolvedServices.length,
    totalPages: 1,
  })
}
