'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type ProviderFormsData = Database['public']['Tables']['provider_forms_data']['Insert']

export interface FormsSubmissionData {
  // Documentação
  has_activity_declaration: boolean
  has_liability_insurance: boolean
  has_work_accidents_insurance: boolean
  certifications: string[]
  works_with_platforms: string[]

  // Disponibilidade
  available_weekdays: string[]
  work_hours_start: string
  work_hours_end: string
  num_technicians: number

  // Recursos
  has_transport: boolean
  has_computer: boolean
  own_equipment: string[]

  // Serviços (UUIDs de angariacao_reference_prices)
  selected_services: string[]

  // Cobertura
  coverage_municipalities: string[]
}

/**
 * Gerar token único para acesso ao forms
 */
export async function generateFormsToken(providerId: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Gerar token simples (em produção, usar algo mais seguro como JWT)
    const token = Buffer.from(`${providerId}:${Date.now()}`).toString('base64url')

    // Guardar token no provider
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('providers')
      .update({ forms_token: token })
      .eq('id', providerId)

    if (error) throw error

    return { success: true, token }
  } catch (error) {
    console.error('Error generating forms token:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao gerar token' }
  }
}

/**
 * Validar token e obter provider_id
 */
export async function validateFormsToken(token: string): Promise<{ valid: boolean; providerId?: string; error?: string }> {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('providers')
      .select('id, name, forms_submitted_at')
      .eq('forms_token', token)
      .single()

    if (error || !data) {
      return { valid: false, error: 'Token inválido' }
    }

    // if (data.forms_submitted_at) {
    //   return { valid: false, error: 'Forms já submetido' }
    // }

    return { valid: true, providerId: data.id }
  } catch (error) {
    console.error('Error validating token:', error)
    return { valid: false, error: 'Erro ao validar token' }
  }
}

/**
 * Obter dados do prestador pelo token
 */
export async function getProviderByToken(token: string) {
  const { valid, providerId, error } = await validateFormsToken(token)

  if (!valid || !providerId) {
    return { success: false, error }
  }

  try {
    const adminClient = createAdminClient()

    const { data, error: fetchError } = await adminClient
      .from('providers')
      .select('id, name, email, phone, nif, location, services')
      .eq('id', providerId)
      .single()

    if (fetchError) throw fetchError

    return { success: true, provider: data }
  } catch (error) {
    console.error('Error fetching provider:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao obter prestador' }
  }
}

/**
 * Submit forms de serviços
 */
export async function submitServicesForm(
  token: string,
  data: FormsSubmissionData,
  ipAddress?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { valid, providerId, error: validationError } = await validateFormsToken(token)

    if (!valid || !providerId) {
      return { success: false, error: validationError || 'Token inválido' }
    }

    const adminClient = createAdminClient()

    // Obter serviços antigos para histórico
    const { data: provider } = await adminClient
      .from('providers')
      .select('services')
      .eq('id', providerId)
      .single()

    const servicesBefor

e = provider?.services || []

    // Inserir/atualizar dados do forms
    const formsData: ProviderFormsData = {
      provider_id: providerId,
      has_activity_declaration: data.has_activity_declaration,
      has_liability_insurance: data.has_liability_insurance,
      has_work_accidents_insurance: data.has_work_accidents_insurance,
      certifications: data.certifications,
      works_with_platforms: data.works_with_platforms,
      available_weekdays: data.available_weekdays,
      work_hours_start: data.work_hours_start,
      work_hours_end: data.work_hours_end,
      num_technicians: data.num_technicians,
      has_transport: data.has_transport,
      has_computer: data.has_computer,
      own_equipment: data.own_equipment,
      selected_services: data.selected_services,
      coverage_municipalities: data.coverage_municipalities,
      submitted_at: new Date().toISOString(),
      submitted_ip: ipAddress || null,
    }

    const { error: formsError } = await adminClient
      .from('provider_forms_data')
      .upsert(formsData, { onConflict: 'provider_id' })

    if (formsError) throw formsError

    // Atualizar providers.forms_submitted_at
    const { error: providerError } = await adminClient
      .from('providers')
      .update({
        forms_submitted_at: new Date().toISOString(),
        forms_response_id: token, // Usar token como ID de resposta
      })
      .eq('id', providerId)

    if (providerError) throw providerError

    // Guardar histórico de alteração de serviços
    const { error: historyError } = await adminClient
      .from('provider_services_history')
      .insert({
        provider_id: providerId,
        services_before: servicesBefore,
        services_after: data.selected_services,
        source: 'forms_submission',
        changed_at: new Date().toISOString(),
      })

    if (historyError) throw historyError

    return { success: true }
  } catch (error) {
    console.error('Error submitting forms:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao submeter formulário' }
  }
}

/**
 * Obter lista de serviços agrupados por cluster e grupo
 */
export async function getServicesForForms() {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('angariacao_reference_prices')
      .select('id, service_name, cluster, service_group, unit_description, typology')
      .eq('is_active', true)
      .order('cluster')
      .order('service_group')
      .order('service_name')

    if (error) throw error

    // Agrupar por cluster e service_group
    const grouped = data.reduce((acc, service) => {
      if (!acc[service.cluster]) {
        acc[service.cluster] = {}
      }
      const group = service.service_group || 'Outros'
      if (!acc[service.cluster][group]) {
        acc[service.cluster][group] = []
      }
      acc[service.cluster][group].push(service)
      return acc
    }, {} as Record<string, Record<string, typeof data>>)

    return { success: true, services: grouped }
  } catch (error) {
    console.error('Error fetching services:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao obter serviços' }
  }
}
