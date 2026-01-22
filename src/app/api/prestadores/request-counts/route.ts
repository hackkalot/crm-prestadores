import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // Verify authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const idsParam = searchParams.get('ids')

  if (!idsParam) {
    return NextResponse.json({ counts: {} })
  }

  const backofficeIds = idsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))

  if (backofficeIds.length === 0) {
    return NextResponse.json({ counts: {} })
  }

  // Convert to strings for the query (assigned_provider_id is stored as string)
  const backofficeIdStrings = backofficeIds.map(String)

  // Get counts from service_requests
  const { data, error } = await createAdminClient()
    .from('service_requests')
    .select('assigned_provider_id')
    .in('assigned_provider_id', backofficeIdStrings)

  if (error) {
    console.error('Erro ao buscar contagens:', error)
    return NextResponse.json({ counts: {} })
  }

  // Count occurrences per provider
  const counts: Record<number, number> = {}
  for (const row of data || []) {
    if (row.assigned_provider_id) {
      const id = parseInt(row.assigned_provider_id, 10)
      if (!isNaN(id)) {
        counts[id] = (counts[id] || 0) + 1
      }
    }
  }

  return NextResponse.json({ counts })
}
