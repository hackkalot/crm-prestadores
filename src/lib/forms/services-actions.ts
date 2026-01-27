'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type ProviderFormsData = Database['public']['Tables']['provider_forms_data']['Insert']

export interface FormsSubmissionData {
  // Dados do Prestador (editáveis)
  provider_name?: string
  provider_email?: string
  provider_phone?: string
  provider_nif?: string

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

  // Serviços (UUIDs de service_prices)
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
      .select('id, name, email, phone, nif, services')
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

    // Obter dados do provider para fallback de campos editáveis e RM para alerta
    const { data: provider } = await adminClient
      .from('providers')
      .select('name, email, phone, nif, relationship_owner_id')
      .eq('id', providerId)
      .single()

    // Get the next submission number for this provider
    const { data: lastSubmission } = await adminClient
      .from('provider_forms_data')
      .select('submission_number')
      .eq('provider_id', providerId)
      .order('submission_number', { ascending: false })
      .limit(1)
      .single()

    const nextSubmissionNumber = (lastSubmission?.submission_number || 0) + 1

    // Insert NEW submission (each submission is a historical snapshot)
    const formsData: ProviderFormsData = {
      provider_id: providerId,
      submission_number: nextSubmissionNumber,
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
      .insert(formsData)

    if (formsError) throw formsError

    // Atualizar providers com TODOS os dados do forms (override completo)
    // provider_forms_data fica como snapshot read-only, providers é a versão editável
    const providerUpdate: Record<string, unknown> = {
      forms_submitted_at: new Date().toISOString(),
      forms_response_id: token,
      // Dados editáveis do prestador
      name: data.provider_name || provider?.name,
      email: data.provider_email || provider?.email,
      phone: data.provider_phone || provider?.phone,
      nif: data.provider_nif || provider?.nif,
      // Serviços e cobertura
      services: data.selected_services,
      counties: data.coverage_municipalities,
      // Documentação
      has_activity_declaration: data.has_activity_declaration,
      has_liability_insurance: data.has_liability_insurance,
      has_work_accidents_insurance: data.has_work_accidents_insurance,
      certifications: data.certifications,
      works_with_platforms: data.works_with_platforms,
      // Disponibilidade
      available_weekdays: data.available_weekdays,
      work_hours_start: data.work_hours_start,
      work_hours_end: data.work_hours_end,
      // Recursos
      num_technicians: data.num_technicians,
      has_own_transport: data.has_transport,
      has_computer: data.has_computer,
      own_equipment: data.own_equipment,
    }

    const { error: providerError } = await adminClient
      .from('providers')
      .update(providerUpdate)
      .eq('id', providerId)

    if (providerError) throw providerError

    // Adicionar entrada no histórico geral
    const { error: logError } = await adminClient
      .from('history_log')
      .insert({
        provider_id: providerId,
        event_type: 'forms_submission',
        description: `Formulário de serviços submetido com ${data.selected_services.length} serviços e ${data.coverage_municipalities.length} concelhos`,
        new_value: {
          services_count: data.selected_services.length,
          municipalities_count: data.coverage_municipalities.length,
          num_technicians: data.num_technicians,
          has_activity_declaration: data.has_activity_declaration,
          has_liability_insurance: data.has_liability_insurance,
          has_work_accidents_insurance: data.has_work_accidents_insurance,
          certifications_count: data.certifications.length,
          platforms_count: data.works_with_platforms.length,
          equipment_count: data.own_equipment.length,
          has_transport: data.has_transport,
          has_computer: data.has_computer,
          available_weekdays: data.available_weekdays,
          work_hours: `${data.work_hours_start} - ${data.work_hours_end}`,
        },
        created_by: null, // Forms submission is done by the provider, not a user
        created_at: new Date().toISOString(),
      })

    if (logError) {
      console.error('Error creating history log:', logError)
      // Don't throw - this is not critical
    }

    // Criar alerta para o RM do prestador (se existir)
    if (provider?.relationship_owner_id) {
      const providerName = data.provider_name || provider.name || 'Prestador'
      const { error: alertError } = await adminClient.from('alerts').insert({
        provider_id: providerId,
        user_id: provider.relationship_owner_id,
        alert_type: 'forms_submission',
        title: 'Formulário de Serviços Submetido',
        message: `${providerName} submeteu o formulário de serviços com ${data.selected_services.length} serviços e ${data.coverage_municipalities.length} concelhos.`,
        trigger_at: new Date().toISOString(),
      })

      if (alertError) {
        console.error('Error creating alert for RM:', alertError)
        // Don't throw - this is not critical
      }
    }

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
      .from('service_prices')
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

/**
 * Obter a última submissão do forms de um prestador (para compatibilidade)
 */
export async function getProviderFormsData(providerId: string) {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('provider_forms_data')
      .select('*')
      .eq('provider_id', providerId)
      .order('submission_number', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrado - retorna null
        return { success: true, formsData: null }
      }
      throw error
    }

    return { success: true, formsData: data }
  } catch (error) {
    console.error('Error fetching forms data:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao obter dados do formulário' }
  }
}

/**
 * Obter TODAS as submissões do forms de um prestador (para histórico)
 */
export async function getAllProviderFormsSubmissions(providerId: string) {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('provider_forms_data')
      .select('*')
      .eq('provider_id', providerId)
      .order('submission_number', { ascending: false })

    if (error) throw error

    return { success: true, submissions: data || [] }
  } catch (error) {
    console.error('Error fetching all forms submissions:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao obter submissões' }
  }
}

// Field labels for history log descriptions
const fieldLabels: Record<string, string> = {
  has_activity_declaration: 'Declaração de Atividade',
  has_liability_insurance: 'Seguro RC',
  has_work_accidents_insurance: 'Seguro Acidentes',
  certifications: 'Certificações',
  works_with_platforms: 'Plataformas',
  available_weekdays: 'Dias da semana',
  work_hours_start: 'Horário início',
  work_hours_end: 'Horário fim',
  num_technicians: 'Número de técnicos',
  has_transport: 'Viatura própria',
  has_computer: 'Computador',
  own_equipment: 'Equipamento próprio',
}

/**
 * Update provider forms data (documentation, resources, availability)
 * Tracks field-level changes with old and new values
 */
export async function updateProviderFormsData(
  providerId: string,
  data: Partial<{
    has_activity_declaration: boolean
    has_liability_insurance: boolean
    has_work_accidents_insurance: boolean
    certifications: string[]
    works_with_platforms: string[]
    available_weekdays: string[]
    work_hours_start: string
    work_hours_end: string
    num_technicians: number
    has_transport: boolean
    has_computer: boolean
    own_equipment: string[]
  }>
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // Get current values for comparison
  const { data: currentData } = await adminClient
    .from('provider_forms_data')
    .select('has_activity_declaration, has_liability_insurance, has_work_accidents_insurance, certifications, works_with_platforms, available_weekdays, work_hours_start, work_hours_end, num_technicians, has_transport, has_computer, own_equipment')
    .eq('provider_id', providerId)
    .single()

  // Update provider_forms_data table
  const { error: updateError } = await adminClient
    .from('provider_forms_data')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('provider_id', providerId)

  if (updateError) {
    console.error('Error updating forms data:', updateError)
    return { error: 'Erro ao atualizar dados do formulário' }
  }

  // Build old_value and new_value with only changed fields
  const oldValue: Record<string, unknown> = {}
  const newValue: Record<string, unknown> = {}
  const changedFields: string[] = []

  for (const [key, value] of Object.entries(data)) {
    const oldVal = currentData?.[key as keyof typeof currentData]

    // Compare arrays properly
    const isArray = Array.isArray(value)
    const hasChanged = isArray
      ? JSON.stringify(oldVal) !== JSON.stringify(value)
      : oldVal !== value

    if (hasChanged) {
      oldValue[key] = oldVal
      newValue[key] = value
      changedFields.push(fieldLabels[key] || key)
    }
  }

  // Log the change with field-level tracking
  if (changedFields.length > 0) {
    await adminClient.from('history_log').insert({
      provider_id: providerId,
      event_type: 'field_change',
      description: `Campos alterados: ${changedFields.join(', ')}`,
      old_value: oldValue,
      new_value: newValue,
      created_by: user.id,
    })
  }

  return {}
}
