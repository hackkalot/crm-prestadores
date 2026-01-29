import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateServiceSheetHTML, saveServiceSheetSnapshot } from '@/lib/service-templates/actions'

export async function GET(request: NextRequest) {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Get provider ID from query params
  const searchParams = request.nextUrl.searchParams
  const providerId = searchParams.get('providerId')

  if (!providerId) {
    return NextResponse.json({ error: 'providerId é obrigatório' }, { status: 400 })
  }

  // Generate HTML
  const result = await generateServiceSheetHTML(providerId)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Save snapshot for history tracking
  await saveServiceSheetSnapshot(providerId, result.snapshotData)

  return NextResponse.json({
    html: result.html,
    providerName: result.providerName,
  })
}
