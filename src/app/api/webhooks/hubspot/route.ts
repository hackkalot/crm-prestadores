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
    const providerData = parseHubSpotSubmission(body)

    if (!providerData.name || !providerData.email) {
      return NextResponse.json({ error: 'Nome e email sao obrigatorios' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Verificar se já existe por email
    const { data: existingProviders } = await supabaseAdmin
      .from('providers')
      .select('id, application_count')
      .eq('email', providerData.email)
      .limit(1)

    let providerId: string
    let isDuplicate = false

    if (existingProviders && existingProviders.length > 0) {
      const existing = existingProviders[0]
      providerId = existing.id
      isDuplicate = true

      await supabaseAdmin
        .from('providers')
        .update({
          application_count: (existing.application_count || 0) + 1,
          phone: providerData.phone,
          website: providerData.website,
          services: providerData.services,
          districts: providerData.districts,
          num_technicians: providerData.num_technicians,
          has_admin_team: providerData.has_admin_team,
          has_own_transport: providerData.has_own_transport,
          working_hours: providerData.working_hours,
        })
        .eq('id', providerId)
    } else {
      const { data: newProvider, error: insertError } = await supabaseAdmin
        .from('providers')
        .insert({ ...providerData, status: 'novo', application_count: 1 })
        .select('id')
        .single()

      if (insertError || !newProvider) {
        console.error('Erro ao criar provider:', insertError)
        return NextResponse.json({ error: 'Erro ao criar candidatura' }, { status: 500 })
      }

      providerId = newProvider.id
    }

    // Guardar historico
    await supabaseAdmin
      .from('application_history')
      .insert({
        provider_id: providerId,
        raw_data: body,
        source: 'hubspot',
        hubspot_submission_id: providerData.hubspot_contact_id,
        applied_at: providerData.first_application_at,
      })

    return NextResponse.json({ success: true, provider_id: providerId, is_duplicate: isDuplicate })
  } catch (error) {
    console.error('Erro no webhook HubSpot:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook HubSpot esta ativo',
    timestamp: new Date().toISOString(),
  })
}
