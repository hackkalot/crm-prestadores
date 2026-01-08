import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const props = body.properties || {}

    // Extract values from HubSpot property structure
    const getValue = (prop: any) => prop?.value || null

    const contactData = {
      name: `${getValue(props.firstname) || ''} ${getValue(props.lastname) || ''}`.trim(),
      email: getValue(props.email),
      phone: getValue(props.phone) || getValue(props.mobilephone),
      hubspot_contact_id: body.vid || getValue(props.hs_object_id),
      // Add any custom properties you need
      business_unit: getValue(props.business_unit),
      company: getValue(props.company),
    }

    console.log('=== HUBSPOT CONTACT RECEIVED ===')
    console.log('Contact ID:', contactData.hubspot_contact_id)
    console.log('Name:', contactData.name)
    console.log('Email:', contactData.email)
    console.log('Phone:', contactData.phone)
    console.log('================================')

    if (!contactData.email || !contactData.name) {
      return NextResponse.json({
        error: 'Email e nome são obrigatórios',
        received: contactData
      }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Check if provider already exists
    const { data: existingProviders } = await supabaseAdmin
      .from('providers')
      .select('id, application_count')
      .eq('email', contactData.email)
      .limit(1)

    let providerId: string

    if (existingProviders && existingProviders.length > 0) {
      // Update existing
      const existing = existingProviders[0]
      providerId = existing.id

      await supabaseAdmin
        .from('providers')
        .update({
          name: contactData.name,
          phone: contactData.phone,
          application_count: (existing.application_count || 0) + 1,
          hubspot_contact_id: contactData.hubspot_contact_id?.toString(),
        })
        .eq('id', providerId)

      console.log('Updated existing provider:', providerId)
    } else {
      // Create new
      const { data: newProvider, error: insertError } = await supabaseAdmin
        .from('providers')
        .insert({
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phone,
          entity_type: 'tecnico', // Default
          status: 'novo',
          application_count: 1,
          hubspot_contact_id: contactData.hubspot_contact_id?.toString(),
          first_application_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (insertError || !newProvider) {
        console.error('Error creating provider:', insertError)
        return NextResponse.json({ error: 'Erro ao criar candidatura' }, { status: 500 })
      }

      providerId = newProvider.id
      console.log('Created new provider:', providerId)
    }

    return NextResponse.json({
      success: true,
      provider_id: providerId,
      is_duplicate: !!existingProviders?.length
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
