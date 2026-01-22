import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bulkResolveServiceNames } from '@/lib/providers/actions'
import { getFullySelectedDistricts } from '@/lib/data/portugal-districts'

export async function GET(request: NextRequest) {
  // Verify authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams

  // Parse filters from query params
  const status = searchParams.get('status') || 'all'
  const entityType = searchParams.get('entityType')
  const counties = searchParams.get('counties')?.split(',').filter(Boolean)
  const services = searchParams.get('services')?.split(',').filter(Boolean)
  const technicians = searchParams.get('technicians')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const sortBy = searchParams.get('sortBy') || 'first_application_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const ascending = sortOrder === 'asc'

  // Build query
  let query = createAdminClient()
    .from('providers')
    .select('*')
    .in('status', ['novo', 'em_onboarding', 'on_hold', 'abandonado'])
    .order(sortBy, { ascending })

  // Apply filters
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (entityType && entityType !== '_all') {
    query = query.eq('entity_type', entityType)
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

  // Technicians filter
  if (technicians && technicians !== '_all') {
    switch (technicians) {
      case '1':
        query = query.eq('num_technicians', 1)
        break
      case '2-5':
        query = query.gte('num_technicians', 2).lte('num_technicians', 5)
        break
      case '6-10':
        query = query.gte('num_technicians', 6).lte('num_technicians', 10)
        break
      case '11+':
        query = query.gte('num_technicians', 11)
        break
    }
  }

  // Date filters
  if (dateFrom) {
    query = query.gte('first_application_at', dateFrom)
  }
  if (dateTo) {
    const endDate = new Date(dateTo)
    endDate.setDate(endDate.getDate() + 1)
    query = query.lt('first_application_at', endDate.toISOString().split('T')[0])
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar candidaturas:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }

  // Resolve service names (UUIDs to names)
  const providers = data || []
  const serviceNamesMap = await bulkResolveServiceNames(
    providers.map(p => ({ id: p.id, services: p.services }))
  )

  // Replace services with resolved names
  const dataWithResolvedServices = providers.map(p => ({
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
