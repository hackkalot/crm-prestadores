import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Cache for service names (in-memory, resets on server restart)
let serviceNamesCache: Map<string, string> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getServiceNamesMap(): Promise<Map<string, string>> {
  const now = Date.now()

  // Return cached if still valid
  if (serviceNamesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return serviceNamesCache
  }

  // Fetch all service prices
  const { data, error } = await createAdminClient()
    .from('service_prices')
    .select('id, service_name')

  if (error || !data) {
    console.error('Erro ao buscar nomes de serviços:', error)
    return new Map()
  }

  // Build map UUID -> name
  const map = new Map<string, string>()
  for (const row of data) {
    map.set(row.id, row.service_name)
  }

  // Update cache
  serviceNamesCache = map
  cacheTimestamp = now

  return map
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { providers } = body as { providers: Array<{ id: string; services: string[] | null }> }

  if (!providers || !Array.isArray(providers)) {
    return NextResponse.json({ resolved: {} })
  }

  const namesMap = await getServiceNamesMap()

  // Resolve service names for each provider
  const resolved: Record<string, string[]> = {}

  for (const provider of providers) {
    if (!provider.services || provider.services.length === 0) {
      resolved[provider.id] = []
      continue
    }

    const resolvedNames: string[] = []
    for (const serviceId of provider.services) {
      const name = namesMap.get(serviceId)
      if (name) {
        // Avoid duplicates
        if (!resolvedNames.includes(name)) {
          resolvedNames.push(name)
        }
      }
    }
    resolved[provider.id] = resolvedNames
  }

  return NextResponse.json({ resolved })
}
