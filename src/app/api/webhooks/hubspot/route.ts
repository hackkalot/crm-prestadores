import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type EntityType = 'tecnico' | 'eni' | 'empresa'

// Mapeamento dos campos do HubSpot para os nossos campos
function parseHubSpotSubmission(data: Record<string, unknown>) {
  const entityTypeField = data['Escolha a opção que mais se adequa a si*'] as string || ''
  let entityType: EntityType = 'tecnico'

  if (entityTypeField.toLowerCase().includes('empresa')) {
    entityType = 'empresa'
  } else if (entityTypeField.toLowerCase().includes('eni')) {
    entityType = 'eni'
  }

  let name: string
  let email: string
  let phone: string
  let nif: string | null = null
  let website: string | null = null
  let services: string | null = null
  let districts: string | null = null

  if (entityType === 'empresa') {
    name = (data['Nome da Empresa*'] as string) || ''
    email = (data['E-mail*'] as string) || ''
    phone = (data['Contacto telefónico*'] as string) || ''
    nif = (data['Qual o NIF associado à sua actividade?*'] as string) || null
    website = (data['Introduza o site da Empresa e/ou links das redes sociais da Empresa (opcional)'] as string) || null
    services = (data['Liste os serviços que realiza*'] as string) || null
    districts = (data['Indique em que distrito presta os seus serviços (Portugal Continental)*'] as string) || null
  } else if (entityType === 'eni') {
    name = (data['Nome do ENI ou Empresa*'] as string) || ''
    email = (data['E-mail do ENI*'] as string) || ''
    phone = (data['Contacto telefónico do ENI*'] as string) || ''
    nif = (data['Qual o NIF associado à sua actividade?*.1'] as string) || null
    website = (data['Introduza o site da Empresa e/ou links das redes sociais da Empresa (opcional).1'] as string) || null
    services = (data['Liste os serviços que realiza*.1'] as string) || null
    districts = (data['Indique em que distrito presta os seus serviços (Portugal Continental)*.1'] as string) || null
  } else {
    name = (data['Nome do Técnico*'] as string) || ''
    email = (data['E-mail do Técnico*'] as string) || ''
    phone = (data['Contacto telefónico do Técnico*'] as string) || ''
    services = (data['Liste os serviços que está habituado a realizar*'] as string) || null
    districts = (data['Indique em que distrito presta os seus serviços (Portugal Continental)'] as string) || null
  }

  const numTechnicians = data['Quantos técnicos constituem a sua equipa?'] as number | null
  const hasAdminTeam = (data['Tem equipa administrativa?*'] as string)?.toLowerCase() === 'sim'
  const hasOwnTransport = (data['Tem meios de transporte próprios para deslocação para a prestação de serviços?*'] as string)?.toLowerCase() === 'sim'
  const workingHours = data['Qual o seu horário laboral?'] as string | null
  const hubspotContactId = data['Contact ID'] as string | null
  const conversionDate = data['Conversion Date'] as string | null

  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || null,
    entity_type: entityType,
    nif: nif?.trim() || null,
    website: website?.trim() || null,
    services: services ? services.split(',').map(s => s.trim()) : null,
    districts: districts ? districts.split(',').map(d => d.trim()) : null,
    num_technicians: numTechnicians || null,
    has_admin_team: hasAdminTeam,
    has_own_transport: hasOwnTransport,
    working_hours: workingHours?.trim() || null,
    hubspot_contact_id: hubspotContactId?.toString() || null,
    first_application_at: conversionDate ? new Date(conversionDate).toISOString() : new Date().toISOString(),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log completo do payload para debug
    console.log('=== HUBSPOT WEBHOOK RECEIVED ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers), null, 2))
    console.log('Body:', JSON.stringify(body, null, 2))
    console.log('Body keys:', Object.keys(body))
    console.log('================================')

    return NextResponse.json({
      success: true,
      message: 'Webhook recebido com sucesso',
      received_keys: Object.keys(body),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    return NextResponse.json({
      error: 'Erro ao processar webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook HubSpot esta ativo',
    timestamp: new Date().toISOString(),
  })
}
