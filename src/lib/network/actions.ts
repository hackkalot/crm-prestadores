'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { PORTUGAL_DISTRICTS, BASE_SERVICES, DISTRICT_ADJACENCY } from './constants'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Tipos
export type CoverageData = {
  district: string
  totalProviders: number
  activeProviders: number
  services: {
    service: string
    providerCount: number
    providers: Array<{
      id: string
      name: string
      status: string
    }>
  }[]
  hasGaps: boolean
  gapServices: string[]
}

export type NetworkGap = {
  district: string
  service: string
  currentProviders: number
  recommendedMinimum: number
  severity: 'critical' | 'warning' | 'ok'
}

export type ProviderMatch = {
  id: string
  name: string
  email: string
  phone: string | null
  entityType: string
  districts: string[]
  services: string[]
  status: string
  matchScore: number
  matchingDistricts: string[]
  matchingServices: string[]
}

// Obter análise de cobertura por distrito
export async function getNetworkCoverage(): Promise<CoverageData[]> {
  const { data: providers, error } = await supabaseAdmin
    .from('providers')
    .select('id, name, status, districts, services')
    .in('status', ['ativo', 'suspenso'])

  if (error || !providers) {
    console.error('Error fetching providers for coverage:', error)
    return []
  }

  const coverageMap = new Map<string, CoverageData>()

  // Inicializar todos os distritos
  for (const district of PORTUGAL_DISTRICTS) {
    coverageMap.set(district, {
      district,
      totalProviders: 0,
      activeProviders: 0,
      services: BASE_SERVICES.map((service) => ({
        service,
        providerCount: 0,
        providers: [],
      })),
      hasGaps: false,
      gapServices: [],
    })
  }

  // Processar prestadores
  for (const provider of providers) {
    const providerDistricts = provider.districts || []
    const providerServices = provider.services || []

    for (const district of providerDistricts) {
      const coverage = coverageMap.get(district)
      if (!coverage) continue

      coverage.totalProviders++
      if (provider.status === 'ativo') {
        coverage.activeProviders++
      }

      // Adicionar prestador aos serviços correspondentes
      for (const serviceData of coverage.services) {
        if (providerServices.includes(serviceData.service)) {
          serviceData.providerCount++
          serviceData.providers.push({
            id: provider.id,
            name: provider.name,
            status: provider.status,
          })
        }
      }
    }
  }

  // Identificar lacunas (serviços com 0 ou 1 prestador ativo)
  for (const coverage of coverageMap.values()) {
    const gaps: string[] = []
    for (const serviceData of coverage.services) {
      const activeCount = serviceData.providers.filter((p) => p.status === 'ativo').length
      if (activeCount < 2) {
        gaps.push(serviceData.service)
      }
    }
    coverage.hasGaps = gaps.length > 0
    coverage.gapServices = gaps
  }

  return Array.from(coverageMap.values()).sort((a, b) => a.district.localeCompare(b.district))
}

// Obter lacunas da rede
export async function getNetworkGaps(): Promise<NetworkGap[]> {
  const coverage = await getNetworkCoverage()
  const gaps: NetworkGap[] = []

  const MINIMUM_PROVIDERS = 2 // Mínimo recomendado de prestadores por serviço/distrito

  for (const districtCoverage of coverage) {
    for (const serviceData of districtCoverage.services) {
      const activeCount = serviceData.providers.filter((p) => p.status === 'ativo').length

      let severity: NetworkGap['severity'] = 'ok'
      if (activeCount === 0) {
        severity = 'critical'
      } else if (activeCount < MINIMUM_PROVIDERS) {
        severity = 'warning'
      }

      if (severity !== 'ok') {
        gaps.push({
          district: districtCoverage.district,
          service: serviceData.service,
          currentProviders: activeCount,
          recommendedMinimum: MINIMUM_PROVIDERS,
          severity,
        })
      }
    }
  }

  // Ordenar por severidade (critical primeiro) e depois por distrito
  return gaps.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, ok: 2 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity]
    }
    return a.district.localeCompare(b.district)
  })
}

// Encontrar prestadores que podem cobrir uma lacuna
export async function findProvidersForGap(
  district: string,
  service: string
): Promise<ProviderMatch[]> {
  // Buscar prestadores que já oferecem o serviço mas não cobrem o distrito
  // OU que cobrem o distrito mas não oferecem o serviço
  const { data: providers, error } = await supabaseAdmin
    .from('providers')
    .select('id, name, email, phone, entity_type, districts, services, status')
    .in('status', ['ativo', 'suspenso'])

  if (error || !providers) {
    console.error('Error fetching providers for matching:', error)
    return []
  }

  const matches: ProviderMatch[] = []

  for (const provider of providers) {
    const providerDistricts = provider.districts || []
    const providerServices = provider.services || []

    const hasDistrict = providerDistricts.includes(district)
    const hasService = providerServices.includes(service)

    // Se já tem ambos, não é um match para expandir
    if (hasDistrict && hasService) continue

    // Calcular score de match
    let matchScore = 0
    const matchingDistricts: string[] = []
    const matchingServices: string[] = []

    // Prestador já oferece o serviço noutra zona
    if (hasService) {
      matchScore += 50
      matchingServices.push(service)
    }

    // Prestador já cobre o distrito com outros serviços
    if (hasDistrict) {
      matchScore += 30
      matchingDistricts.push(district)
    }

    // Prestador cobre distritos adjacentes
    const adjacentDistricts = getAdjacentDistricts(district)
    for (const adj of adjacentDistricts) {
      if (providerDistricts.includes(adj)) {
        matchScore += 10
        matchingDistricts.push(adj)
      }
    }

    // Só incluir se tiver algum match relevante
    if (matchScore > 0) {
      matches.push({
        id: provider.id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone,
        entityType: provider.entity_type,
        districts: providerDistricts,
        services: providerServices,
        status: provider.status,
        matchScore,
        matchingDistricts: [...new Set(matchingDistricts)],
        matchingServices: [...new Set(matchingServices)],
      })
    }
  }

  // Ordenar por score e limitar resultados
  return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 20)
}

// Obter estatísticas gerais da rede
export async function getNetworkStats() {
  const coverage = await getNetworkCoverage()
  const gaps = await getNetworkGaps()

  const totalDistricts = coverage.length
  const districtsWithGaps = coverage.filter((c) => c.hasGaps).length
  const totalGaps = gaps.length
  const criticalGaps = gaps.filter((g) => g.severity === 'critical').length
  const warningGaps = gaps.filter((g) => g.severity === 'warning').length

  // Calcular cobertura média
  const totalServices = totalDistricts * BASE_SERVICES.length
  const servicesWithCoverage = coverage.reduce(
    (acc, c) => acc + c.services.filter((s) => s.providerCount > 0).length,
    0
  )
  const coveragePercentage = Math.round((servicesWithCoverage / totalServices) * 100)

  return {
    totalDistricts,
    districtsWithGaps,
    districtsFullyCovered: totalDistricts - districtsWithGaps,
    totalGaps,
    criticalGaps,
    warningGaps,
    coveragePercentage,
  }
}

// Obter distritos adjacentes
function getAdjacentDistricts(district: string): string[] {
  return DISTRICT_ADJACENCY[district] || []
}

// Obter cobertura de um distrito específico
export async function getDistrictCoverage(district: string): Promise<CoverageData | null> {
  const coverage = await getNetworkCoverage()
  return coverage.find((c) => c.district === district) || null
}

// Buscar prestadores disponíveis por filtros
export async function searchAvailableProviders(filters: {
  district?: string
  service?: string
  status?: string
}): Promise<ProviderMatch[]> {
  let query = supabaseAdmin
    .from('providers')
    .select('id, name, email, phone, entity_type, districts, services, status')
    .in('status', ['ativo', 'suspenso'])

  const { data: providers, error } = await query

  if (error || !providers) {
    console.error('Error searching providers:', error)
    return []
  }

  let results = providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    email: provider.email,
    phone: provider.phone,
    entityType: provider.entity_type,
    districts: provider.districts || [],
    services: provider.services || [],
    status: provider.status,
    matchScore: 100,
    matchingDistricts: provider.districts || [],
    matchingServices: provider.services || [],
  }))

  // Filtrar por distrito
  if (filters.district) {
    results = results.filter((p) => p.districts.includes(filters.district!))
  }

  // Filtrar por serviço
  if (filters.service) {
    results = results.filter((p) => p.services.includes(filters.service!))
  }

  // Filtrar por status
  if (filters.status && filters.status !== 'all') {
    results = results.filter((p) => p.status === filters.status)
  }

  return results.sort((a, b) => a.name.localeCompare(b.name))
}
