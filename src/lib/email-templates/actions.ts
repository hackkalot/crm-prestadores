'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

// Types
export type EmailTemplate = Database['public']['Tables']['email_templates']['Row']
export type EmailTemplateInsert = Database['public']['Tables']['email_templates']['Insert']
export type EmailTemplateUpdate = Database['public']['Tables']['email_templates']['Update']

export interface EmailTemplateWithCreator extends EmailTemplate {
  created_by_user?: { id: string; name: string; email: string } | null
  updated_by_user?: { id: string; name: string; email: string } | null
}

// Get all email templates
export async function getEmailTemplates(): Promise<EmailTemplateWithCreator[]> {
  const { data, error } = await createAdminClient()
    .from('email_templates')
    .select(`
      *,
      created_by_user:users!email_templates_created_by_fkey(id, name, email),
      updated_by_user:users!email_templates_updated_by_fkey(id, name, email)
    `)
    .order('name', { ascending: true })

  if (error) {
    console.error('Erro ao buscar email templates:', error)
    return []
  }

  return data as EmailTemplateWithCreator[]
}

// Get a single email template by ID
export async function getEmailTemplate(id: string): Promise<EmailTemplateWithCreator | null> {
  const { data, error } = await createAdminClient()
    .from('email_templates')
    .select(`
      *,
      created_by_user:users!email_templates_created_by_fkey(id, name, email),
      updated_by_user:users!email_templates_updated_by_fkey(id, name, email)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erro ao buscar email template:', error)
    return null
  }

  return data as EmailTemplateWithCreator
}

// Get a single email template by key (for programmatic use)
export async function getEmailTemplateByKey(key: string): Promise<EmailTemplate | null> {
  const { data, error } = await createAdminClient()
    .from('email_templates')
    .select('*')
    .eq('key', key)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is expected
      console.error('Erro ao buscar email template por key:', error)
    }
    return null
  }

  return data
}

// Create a new email template
export async function createEmailTemplate(
  template: Omit<EmailTemplateInsert, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>
): Promise<{ success: boolean; error?: string; data?: EmailTemplate }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  // Check if key already exists
  const { data: existing } = await createAdminClient()
    .from('email_templates')
    .select('id')
    .eq('key', template.key)
    .single()

  if (existing) {
    return { success: false, error: 'Já existe um template com esta chave' }
  }

  const { data, error } = await createAdminClient()
    .from('email_templates')
    .insert({
      ...template,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar email template:', error)
    return { success: false, error: 'Erro ao criar template' }
  }

  revalidatePath('/configuracoes')
  return { success: true, data }
}

// Update an email template
export async function updateEmailTemplate(
  id: string,
  template: Partial<Omit<EmailTemplateUpdate, 'id' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'>>
): Promise<{ success: boolean; error?: string; data?: EmailTemplate }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  // If key is being changed, check if new key already exists
  if (template.key) {
    const { data: existing } = await createAdminClient()
      .from('email_templates')
      .select('id')
      .eq('key', template.key)
      .neq('id', id)
      .single()

    if (existing) {
      return { success: false, error: 'Já existe um template com esta chave' }
    }
  }

  const { data, error } = await createAdminClient()
    .from('email_templates')
    .update({
      ...template,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar email template:', error)
    return { success: false, error: 'Erro ao atualizar template' }
  }

  revalidatePath('/configuracoes')
  return { success: true, data }
}

// Delete an email template
export async function deleteEmailTemplate(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  const { error } = await createAdminClient()
    .from('email_templates')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao eliminar email template:', error)
    return { success: false, error: 'Erro ao eliminar template' }
  }

  revalidatePath('/configuracoes')
  return { success: true }
}

// Get email template for a task
export async function getEmailTemplateForTask(taskDefinitionId: string): Promise<EmailTemplate | null> {
  const { data, error } = await createAdminClient()
    .from('task_definitions')
    .select(`
      email_template:email_templates(*)
    `)
    .eq('id', taskDefinitionId)
    .single()

  if (error || !data?.email_template) {
    return null
  }

  // Handle array vs single object from Supabase
  const template = Array.isArray(data.email_template) ? data.email_template[0] : data.email_template
  return template as EmailTemplate
}

// Get email template by task definition ID with provider data for interpolation
export async function prepareTaskEmail(
  taskDefinitionId: string,
  providerId: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string; mailtoUrl?: string; template?: EmailTemplate }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  // Get task definition with email template
  const { data: taskDef, error: taskError } = await adminClient
    .from('task_definitions')
    .select(`
      email_template:email_templates(*)
    `)
    .eq('id', taskDefinitionId)
    .single()

  if (taskError || !taskDef?.email_template) {
    return { success: false, error: 'Template de email não encontrado para esta tarefa' }
  }

  const template = Array.isArray(taskDef.email_template) ? taskDef.email_template[0] : taskDef.email_template

  // Get provider data
  const { data: provider, error: providerError } = await adminClient
    .from('providers')
    .select('id, name, email, phone, nif, forms_token')
    .eq('id', providerId)
    .single()

  if (providerError || !provider) {
    return { success: false, error: 'Prestador não encontrado' }
  }

  // Check if template uses forms_link (simple or with custom text)
  const needsFormsLink = template.body?.includes('forms_link') || template.subject?.includes('forms_link')

  // Generate new forms token if needed
  let formsLink = ''
  if (needsFormsLink) {
    // Import dynamically to avoid circular dependency
    const { generateFormsToken } = await import('@/lib/forms/services-actions')
    const tokenResult = await generateFormsToken(providerId)
    if (tokenResult.success && tokenResult.token) {
      formsLink = `${baseUrl}/forms/services/${tokenResult.token}`
    }
  }

  // Build variables object
  const variables: Record<string, string> = {
    nome_prestador: provider.name || '',
    email_prestador: provider.email || '',
    telefone_prestador: provider.phone || '',
    nif_prestador: provider.nif || '',
    forms_link: formsLink,
  }

  // Interpolate template
  let subject = template.subject
  let body = template.body

  // First, handle special syntax {{forms_link:Custom Text}}
  // This converts to "Custom Text: URL" in plain text
  const formsLinkWithTextPattern = /\{\{\s*forms_link:([^}]+)\}\}/g
  body = body.replace(formsLinkWithTextPattern, (_match: string, linkText: string) => {
    return formsLink ? `${linkText.trim()}: ${formsLink}` : linkText.trim()
  })
  subject = subject.replace(formsLinkWithTextPattern, (_match: string, linkText: string) => {
    return formsLink ? `${linkText.trim()}: ${formsLink}` : linkText.trim()
  })

  // Then handle regular variables
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    subject = subject.replace(pattern, value)
    body = body.replace(pattern, value)
  }

  // Convert HTML body to plain text for mailto
  // Remove HTML tags but preserve line breaks
  const plainTextBody = body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()

  // Build mailto URL
  const mailtoUrl = `mailto:${encodeURIComponent(provider.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainTextBody)}`

  return {
    success: true,
    mailtoUrl,
    template: { ...template, subject, body: plainTextBody } as EmailTemplate
  }
}

// Toggle active status
export async function toggleEmailTemplateActive(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  // Get current status
  const { data: current, error: fetchError } = await createAdminClient()
    .from('email_templates')
    .select('is_active')
    .eq('id', id)
    .single()

  if (fetchError || !current) {
    return { success: false, error: 'Template não encontrado' }
  }

  const { error } = await createAdminClient()
    .from('email_templates')
    .update({
      is_active: !current.is_active,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Erro ao alternar estado do template:', error)
    return { success: false, error: 'Erro ao alternar estado' }
  }

  revalidatePath('/configuracoes')
  return { success: true }
}
