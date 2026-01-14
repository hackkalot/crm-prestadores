'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface CoverageThreshold {
  good_min: number
  low_min: number
  at_risk_max: number
}

export interface ServiceCoverage {
  category: string
  service: string
  taxonomy_service_id: string
  provider_count: number
  provider_ids: string[]
  provider_names: string[]
  status: 'good' | 'low' | 'at_risk'
  recommendation?: string
}

export interface MunicipalityCoverage {
  municipality: string
  district: string
  services: ServiceCoverage[]
  totalServices: number
  goodCoverage: number
  lowCoverage: number
  atRisk: number
  overallStatus: 'good' | 'low' | 'at_risk'
}

// Default thresholds (podem ser configurados no futuro)
const DEFAULT_THRESHOLDS: CoverageThreshold = {
  good_min: 3,    // >= 3 prestadores = boa cobertura
  low_min: 1,     // 1-2 prestadores = baixa cobertura
  at_risk_max: 0, // 0 prestadores = em risco
}

function getCoverageStatus(
  providerCount: number,
  thresholds: CoverageThreshold = DEFAULT_THRESHOLDS
): 'good' | 'low' | 'at_risk' {
  if (providerCount >= thresholds.good_min) return 'good'
  if (providerCount >= thresholds.low_min) return 'low'
  return 'at_risk'
}

function getRecommendation(
  service: string,
  category: string,
  providerCount: number,
  municipality: string,
  thresholds: CoverageThreshold = DEFAULT_THRESHOLDS
): string | undefined {
  const needed = thresholds.good_min - providerCount

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

  // Process services and apply thresholds
  const services: ServiceCoverage[] = data.map((row) => {
    const providerCount = row.provider_count || 0
    const status = getCoverageStatus(providerCount)
    const recommendation =
      status !== 'good'
        ? getRecommendation(
            row.service,
            row.category,
            providerCount,
            municipality
          )
        : undefined

    return {
      category: row.category,
      service: row.service,
      taxonomy_service_id: row.taxonomy_service_id,
      provider_count: providerCount,
      provider_ids: row.provider_ids || [],
      provider_names: row.provider_names || [],
      status,
      recommendation,
    }
  })

  // Calculate statistics
  const goodCoverage = services.filter((s) => s.status === 'good').length
  const lowCoverage = services.filter((s) => s.status === 'low').length
  const atRisk = services.filter((s) => s.status === 'at_risk').length

  // Overall status based on majority
  let overallStatus: 'good' | 'low' | 'at_risk' = 'good'
  if (atRisk > services.length / 2) {
    overallStatus = 'at_risk'
  } else if (lowCoverage + atRisk > services.length / 2) {
    overallStatus = 'low'
  }

  return {
    municipality,
    district: district || data[0]?.district || '',
    services,
    totalServices: services.length,
    goodCoverage,
    lowCoverage,
    atRisk,
    overallStatus,
  }
}

export async function getAllMunicipalitiesCoverage(): Promise<
  Array<{ municipality: string; district: string; status: 'good' | 'low' | 'at_risk' }>
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

  // Get all unique municipalities with their coverage
  const { data, error } = await admin
    .from('provider_coverage_by_service')
    .select('municipality, district, provider_count')

  if (error || !data) {
    return []
  }

  // Group by municipality and calculate status
  const municipalityMap = new Map<
    string,
    { district: string; counts: number[] }
  >()

  data.forEach((row) => {
    if (!municipalityMap.has(row.municipality)) {
      municipalityMap.set(row.municipality, {
        district: row.district,
        counts: [],
      })
    }
    municipalityMap.get(row.municipality)!.counts.push(row.provider_count || 0)
  })

  // Calculate overall status for each municipality
  return Array.from(municipalityMap.entries()).map(([municipality, { district, counts }]) => {
    const avgCoverage = counts.reduce((sum, c) => sum + c, 0) / counts.length
    const status = getCoverageStatus(Math.round(avgCoverage))

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
