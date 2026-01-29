'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import type { Database } from '@/types/database'

type ProviderFormsData = Database['public']['Tables']['provider_forms_data']['Insert']

// =============================================================================
// SECURITY CONSTANTS
// =============================================================================

// Token expires 30 minutes after form submission (window for feedback)
const TOKEN_FEEDBACK_WINDOW_MINUTES = 30

// Rate limiting: max attempts per window
const RATE_LIMIT_MAX_ATTEMPTS = 10
const RATE_LIMIT_WINDOW_MINUTES = 15
const RATE_LIMIT_BLOCK_MINUTES = 60

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Check and update rate limit for an identifier (IP or token)
 * Returns true if request should be blocked
 */
async function checkRateLimit(
  identifier: string,
  identifierType: 'ip' | 'token'
): Promise<{ blocked: boolean; remainingAttempts?: number }> {
  const adminClient = createAdminClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)

  // Get existing rate limit record
  const { data: existing } = await adminClient
    .from('forms_rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('identifier_type', identifierType)
    .single()

  if (existing) {
    // Check if currently blocked
    if (existing.blocked_until && new Date(existing.blocked_until) > now) {
      return { blocked: true }
    }

    // Check if within rate limit window
    if (new Date(existing.first_attempt_at) > windowStart) {
      const newAttempts = (existing.attempts || 0) + 1

      if (newAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
        // Block the identifier
        const blockedUntil = new Date(now.getTime() + RATE_LIMIT_BLOCK_MINUTES * 60 * 1000)
        await adminClient
          .from('forms_rate_limits')
          .update({
            attempts: newAttempts,
            last_attempt_at: now.toISOString(),
            blocked_until: blockedUntil.toISOString(),
          })
          .eq('id', existing.id)

        return { blocked: true }
      }

      // Update attempt count
      await adminClient
        .from('forms_rate_limits')
        .update({
          attempts: newAttempts,
          last_attempt_at: now.toISOString(),
        })
        .eq('id', existing.id)

      return { blocked: false, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - newAttempts }
    } else {
      // Window expired, reset counter
      await adminClient
        .from('forms_rate_limits')
        .update({
          attempts: 1,
          first_attempt_at: now.toISOString(),
          last_attempt_at: now.toISOString(),
          blocked_until: null,
        })
        .eq('id', existing.id)

      return { blocked: false, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - 1 }
    }
  } else {
    // Create new rate limit record
    await adminClient.from('forms_rate_limits').insert({
      identifier,
      identifier_type: identifierType,
      attempts: 1,
      first_attempt_at: now.toISOString(),
      last_attempt_at: now.toISOString(),
    })

    return { blocked: false, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - 1 }
  }
}

/**
 * Get client IP from headers
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers()
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  )
}

// =============================================================================
// SECURE TOKEN GENERATION
// =============================================================================

/**
 * Generate a cryptographically secure token
 * Format: random_bytes(32) as hex = 64 characters
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

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
 * Gerar token único e seguro para acesso ao forms
 * - Token criptograficamente seguro (32 bytes random)
 * - Invalida token anterior automaticamente
 * - Guarda timestamp de criação para auditoria
 */
export async function generateFormsToken(providerId: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Gerar token criptograficamente seguro
    const token = generateSecureToken()

    // Guardar novo token no provider (substitui o anterior automaticamente)
    // forms_token_expires_at é null inicialmente - só é definido após submissão
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('providers')
      .update({
        forms_token: token,
        forms_token_created_at: new Date().toISOString(),
        forms_token_expires_at: null, // Reset expiration - will be set after submission
      })
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
 * - Verifica rate limiting por IP
 * - Verifica se token existe
 * - Verifica se token não expirou
 * - Permite acesso durante janela de feedback após submissão
 */
export async function validateFormsToken(
  token: string,
  options: { skipRateLimit?: boolean; allowExpiredForFeedback?: boolean } = {}
): Promise<{ valid: boolean; providerId?: string; error?: string; isInFeedbackWindow?: boolean }> {
  try {
    // Rate limiting check (unless skipped for internal calls)
    if (!options.skipRateLimit) {
      const clientIP = await getClientIP()
      const rateLimit = await checkRateLimit(clientIP, 'ip')

      if (rateLimit.blocked) {
        return { valid: false, error: 'Demasiadas tentativas. Tente novamente mais tarde.' }
      }
    }

    // Validate token format (should be 64 hex characters for new tokens)
    // Also accept legacy base64url tokens for backwards compatibility
    if (!token || token.length < 10) {
      return { valid: false, error: 'Token inválido' }
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('providers')
      .select('id, name, forms_submitted_at, forms_token_expires_at, forms_token_created_at')
      .eq('forms_token', token)
      .single()

    if (error || !data) {
      return { valid: false, error: 'Token inválido ou expirado' }
    }

    const now = new Date()

    // Check if token has expired
    if (data.forms_token_expires_at) {
      const expiresAt = new Date(data.forms_token_expires_at)

      if (now > expiresAt) {
        // Token expired
        if (options.allowExpiredForFeedback) {
          // For feedback submission, we allow a grace period check
          return { valid: false, error: 'O prazo para enviar feedback expirou' }
        }
        return { valid: false, error: 'Este link expirou. Solicite um novo link.' }
      }

      // Token is within feedback window (form already submitted)
      return { valid: true, providerId: data.id, isInFeedbackWindow: true }
    }

    // Token has no expiration - form not yet submitted
    return { valid: true, providerId: data.id, isInFeedbackWindow: false }
  } catch (error) {
    console.error('Error validating token:', error)
    return { valid: false, error: 'Erro ao validar token' }
  }
}

/**
 * Obter dados do prestador pelo token
 * Returns minimal data needed for the form - no sensitive information
 */
export async function getProviderByToken(token: string) {
  const { valid, providerId, error, isInFeedbackWindow } = await validateFormsToken(token)

  if (!valid || !providerId) {
    return { success: false, error }
  }

  // If in feedback window, form already submitted - don't allow re-access to form
  if (isInFeedbackWindow) {
    return { success: false, error: 'O formulário já foi submetido.' }
  }

  try {
    const adminClient = createAdminClient()

    // Only return non-sensitive fields needed for the form
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
 * - Validates token and rate limits
 * - Sets token expiration after submission (feedback window)
 */
export async function submitServicesForm(
  token: string,
  data: FormsSubmissionData,
  ipAddress?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { valid, providerId, error: validationError, isInFeedbackWindow } = await validateFormsToken(token)

    if (!valid || !providerId) {
      return { success: false, error: validationError || 'Token inválido' }
    }

    // Don't allow re-submission if already in feedback window
    if (isInFeedbackWindow) {
      return { success: false, error: 'O formulário já foi submetido.' }
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

    // Calculate token expiration (feedback window)
    const feedbackWindowExpiry = new Date(Date.now() + TOKEN_FEEDBACK_WINDOW_MINUTES * 60 * 1000)

    // Atualizar providers com TODOS os dados do forms (override completo)
    // provider_forms_data fica como snapshot read-only, providers é a versão editável
    const providerUpdate: Record<string, unknown> = {
      forms_submitted_at: new Date().toISOString(),
      forms_response_id: token,
      forms_token_expires_at: feedbackWindowExpiry.toISOString(), // Token expires after feedback window
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

// Feedback type definition
export interface ProviderFeedback {
  nps_score?: number // 0-10
  ratings?: {
    ease_of_use?: number // 1-5
    clarity?: number // 1-5
    time_spent?: number // 1-5
  }
  time_perception?: 'quick' | 'adequate' | 'long'
  comment?: string
  submitted_at?: string
  skipped?: boolean
}

/**
 * Submit provider feedback after form submission
 * - Only allowed during feedback window (token must be valid and in feedback state)
 * - Invalidates token completely after feedback is submitted
 */
export async function submitProviderFeedback(
  token: string,
  feedback: ProviderFeedback
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate token - must be in feedback window
    const { valid, providerId, error: validationError, isInFeedbackWindow } = await validateFormsToken(token)

    if (!valid || !providerId) {
      return { success: false, error: validationError || 'Token inválido' }
    }

    // Feedback can only be submitted after form submission (during feedback window)
    if (!isInFeedbackWindow) {
      return { success: false, error: 'O formulário ainda não foi submetido' }
    }

    const adminClient = createAdminClient()

    // Get the latest submission for this provider
    const { data: latestSubmission } = await adminClient
      .from('provider_forms_data')
      .select('id, submission_number, feedback')
      .eq('provider_id', providerId)
      .order('submission_number', { ascending: false })
      .limit(1)
      .single()

    if (!latestSubmission) {
      return { success: false, error: 'Nenhuma submissão encontrada' }
    }

    // Check if feedback was already submitted
    if (latestSubmission.feedback && !feedback.skipped) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingFeedback = latestSubmission.feedback as any
      if (existingFeedback.submitted_at && !existingFeedback.skipped) {
        return { success: false, error: 'O feedback já foi enviado' }
      }
    }

    // Add submitted_at timestamp
    const feedbackWithTimestamp: ProviderFeedback = {
      ...feedback,
      submitted_at: new Date().toISOString(),
    }

    // Update the latest submission with feedback
    const { error: updateError } = await adminClient
      .from('provider_forms_data')
      .update({
        feedback: feedbackWithTimestamp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', latestSubmission.id)

    if (updateError) {
      console.error('Error saving feedback:', updateError)
      return { success: false, error: 'Erro ao guardar feedback' }
    }

    // Invalidate token completely after feedback (set expiration to now)
    await adminClient
      .from('providers')
      .update({
        forms_token_expires_at: new Date().toISOString(),
      })
      .eq('id', providerId)

    return { success: true }
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao submeter feedback' }
  }
}
