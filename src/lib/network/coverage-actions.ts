'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCoverageSettings } from '@/lib/settings/coverage-actions'

export interface CoverageThreshold {
  requests_per_provider: number
  capacity_good_min: number
  capacity_low_min: number
}

export interface ServiceCoverage {
  category: string
  service: string
  taxonomy_service_id: string
  provider_count: number
  request_count: number
  capacity_percentage: number
  provider_ids: string[]
  provider_names: string[]
  status: 'good' | 'low' | 'bad'
  recommendation?: string
}

export interface MunicipalityCoverage {
  municipality: string
  district: string
  services: ServiceCoverage[]
  totalServices: number
  goodCoverage: number
  lowCoverage: number
  badCoverage: number
  overallStatus: 'good' | 'low' | 'bad'
}

// Default thresholds
const DEFAULT_THRESHOLDS: CoverageThreshold = {
  requests_per_provider: 20,  // 1 prestador consegue cobrir 20 pedidos
  capacity_good_min: 100,     // >= 100% capacidade = boa cobertura
  capacity_low_min: 50,       // >= 50% capacidade = baixa cobertura
}

/**
 * Calcula a capacidade de cobertura em %
 * Capacidade = (Prestadores × Pedidos_por_Prestador) / Total_Pedidos × 100
 */
function calculateCapacity(
  providerCount: number,
  requestCount: number,
  requestsPerProvider: number
): number {
  if (requestCount === 0) return 0
  return Math.round((providerCount * requestsPerProvider) / requestCount * 100)
}

/**
 * Determina o status de cobertura baseado na % de capacidade
 */
function getCoverageStatus(
  capacityPercentage: number,
  thresholds: CoverageThreshold = DEFAULT_THRESHOLDS
): 'good' | 'low' | 'bad' {
  if (capacityPercentage >= thresholds.capacity_good_min) return 'good'
  if (capacityPercentage >= thresholds.capacity_low_min) return 'low'
  return 'bad'
}

/**
 * Calcula quantos prestadores são necessários para atingir boa cobertura
 */
function getRecommendation(
  service: string,
  category: string,
  providerCount: number,
  requestCount: number,
  municipality: string,
  thresholds: CoverageThreshold = DEFAULT_THRESHOLDS
): string | undefined {
  // Prestadores necessários para boa cobertura (100%)
  const neededForGood = Math.ceil(requestCount / thresholds.requests_per_provider)
  const needed = neededForGood - providerCount

  if (needed <= 0) return undefined

  const serviceType = service.toLowerCase().includes('limpeza')
    ? 'Limpeza'
    : service.toLowerCase().includes('canaliza')
    ? 'Canalizador'
    : service.toLowerCase().includes('eletric')
    ? 'Eletricista'
    : category

  return `Contratar ${needed} ${serviceType}${needed > 1 ? 's' : ''} em ${municipality}`
}

export async function getMunicipalityCoverage(
  municipality: string,
  district?: string
): Promise<MunicipalityCoverage | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // Fetch coverage settings
  const settings = await getCoverageSettings()
  const thresholds: CoverageThreshold = {
    requests_per_provider: settings.coverage_requests_per_provider,
    capacity_good_min: settings.coverage_capacity_good_min,
    capacity_low_min: settings.coverage_capacity_low_min,
  }

  const admin = createAdminClient()

  // Query the coverage view
  let query = admin
    .from('provider_coverage_by_service')
    .select('*')
    .eq('municipality', municipality)

  if (district) {
    query = query.eq('district', district)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetching coverage:', error)
    return null
  }

  // Process services and apply capacity-based thresholds
  const services: ServiceCoverage[] = data.map((row) => {
    const providerCount = row.provider_count || 0
    const requestCount = row.request_count || 0
    const capacityPercentage = calculateCapacity(
      providerCount,
      requestCount,
      thresholds.requests_per_provider
    )
    const status = getCoverageStatus(capacityPercentage, thresholds)
    const recommendation =
      status !== 'good'
        ? getRecommendation(
            row.service,
            row.category,
            providerCount,
            requestCount,
            municipality,
            thresholds
          )
        : undefined

    return {
      category: row.category,
      service: row.service,
      taxonomy_service_id: row.taxonomy_service_id,
      provider_count: providerCount,
      request_count: requestCount,
      capacity_percentage: capacityPercentage,
      provider_ids: row.provider_ids || [],
      provider_names: row.provider_names || [],
      status,
      recommendation,
    }
  })

  // Calculate statistics
  const goodCoverage = services.filter((s) => s.status === 'good').length
  const lowCoverage = services.filter((s) => s.status === 'low').length
  const badCoverage = services.filter((s) => s.status === 'bad').length

  // Overall status based on majority
  let overallStatus: 'good' | 'low' | 'bad' = 'good'
  if (badCoverage > services.length / 2) {
    overallStatus = 'bad'
  } else if (lowCoverage + badCoverage > services.length / 2) {
    overallStatus = 'low'
  }

  return {
    municipality,
    district: district || data[0]?.district || '',
    services,
    totalServices: services.length,
    goodCoverage,
    lowCoverage,
    badCoverage,
    overallStatus,
  }
}

export async function getAllMunicipalitiesCoverage(): Promise<
  Array<{ municipality: string; district: string; status: 'good' | 'low' | 'bad' }>
> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return []
  }

  // Fetch coverage settings
  const settings = await getCoverageSettings()
  const thresholds: CoverageThreshold = {
    requests_per_provider: settings.coverage_requests_per_provider,
    capacity_good_min: settings.coverage_capacity_good_min,
    capacity_low_min: settings.coverage_capacity_low_min,
  }

  const admin = createAdminClient()

  // Get all unique municipalities with their coverage (including request_count)
  const { data, error } = await admin
    .from('provider_coverage_by_service')
    .select('municipality, district, provider_count, request_count')

  if (error || !data) {
    return []
  }

  // Group by municipality and calculate capacity-based status
  const municipalityMap = new Map<
    string,
    { district: string; capacities: number[] }
  >()

  data.forEach((row) => {
    const capacity = calculateCapacity(
      row.provider_count || 0,
      row.request_count || 0,
      thresholds.requests_per_provider
    )

    if (!municipalityMap.has(row.municipality)) {
      municipalityMap.set(row.municipality, {
        district: row.district,
        capacities: [],
      })
    }
    municipalityMap.get(row.municipality)!.capacities.push(capacity)
  })

  // Calculate overall status for each municipality based on average capacity
  return Array.from(municipalityMap.entries()).map(([municipality, { district, capacities }]) => {
    const avgCapacity = Math.round(
      capacities.reduce((sum, c) => sum + c, 0) / capacities.length
    )
    const status = getCoverageStatus(avgCapacity, thresholds)

    return { municipality, district, status }
  })
}

export async function getServiceCoverageAcrossRegions(
  taxonomyServiceId: string
): Promise<
  Array<{
    municipality: string
    district: string
    provider_count: number
    provider_names: string[]
  }>
> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return []
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('provider_coverage_by_service')
    .select('municipality, district, provider_count, provider_names')
    .eq('taxonomy_service_id', taxonomyServiceId)
    .order('provider_count', { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map((row) => ({
    municipality: row.municipality,
    district: row.district,
    provider_count: row.provider_count || 0,
    provider_names: row.provider_names || [],
  }))
}

export interface MunicipalityGaps {
  municipality: string
  district: string
  totalGaps: number
  badGaps: number  // má cobertura
  lowGaps: number  // baixa cobertura
  gapServices: Array<{
    category: string
    service: string
    status: 'low' | 'bad'
    capacity: number
  }>
}

export async function getAllMunicipalitiesGaps(
  serviceFilter?: string
): Promise<MunicipalityGaps[]> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return []
  }

  // Fetch coverage settings
  const settings = await getCoverageSettings()
  const thresholds: CoverageThreshold = {
    requests_per_provider: settings.coverage_requests_per_provider,
    capacity_good_min: settings.coverage_capacity_good_min,
    capacity_low_min: settings.coverage_capacity_low_min,
  }

  const admin = createAdminClient()

  // Get all services coverage data
  let query = admin
    .from('provider_coverage_by_service')
    .select('municipality, district, category, service, provider_count, request_count')

  // Apply service filter if provided
  if (serviceFilter) {
    query = query.eq('service', serviceFilter)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Error fetching municipalities gaps:', error)
    return []
  }

  // Group by municipality and calculate gaps
  const municipalityMap = new Map<string, {
    district: string
    gapServices: Array<{
      category: string
      service: string
      status: 'low' | 'bad'
      capacity: number
    }>
  }>()

  data.forEach((row) => {
    const capacity = calculateCapacity(
      row.provider_count || 0,
      row.request_count || 0,
      thresholds.requests_per_provider
    )

    const status = getCoverageStatus(capacity, thresholds)

    // Only track services with gaps (low or bad)
    if (status === 'low' || status === 'bad') {
      if (!municipalityMap.has(row.municipality)) {
        municipalityMap.set(row.municipality, {
          district: row.district,
          gapServices: [],
        })
      }

      municipalityMap.get(row.municipality)!.gapServices.push({
        category: row.category,
        service: row.service,
        status,
        capacity,
      })
    }
  })

  // Convert to array and calculate counts
  return Array.from(municipalityMap.entries())
    .map(([municipality, { district, gapServices }]) => {
      const badGaps = gapServices.filter(s => s.status === 'bad').length
      const lowGaps = gapServices.filter(s => s.status === 'low').length

      return {
        municipality,
        district,
        totalGaps: gapServices.length,
        badGaps,
        lowGaps,
        gapServices,
      }
    })
    .filter(m => m.totalGaps > 0) // Only municipalities with gaps
    .sort((a, b) => b.badGaps - a.badGaps || b.totalGaps - a.totalGaps) // Sort by severity
}
