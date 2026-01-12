'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ParsedProvider } from './csv-parser'
import type { Database } from '@/types/database'

type ProviderInsert = Database['public']['Tables']['providers']['Insert']

export interface DuplicateProvider {
  parsed: ParsedProvider
  existing: {
    id: string
    name: string
    email: string
    status: string
    application_count: number
  }
}

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: Array<{
    provider: ParsedProvider
    error: string
  }>
  duplicates?: DuplicateProvider[]
}

// Helper to split array into chunks
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Batch check for existing providers by email (OPTIMIZED)
 * Returns a Map of email -> existing provider data
 */
async function batchCheckDuplicates(emails: string[]): Promise<Map<string, {
  id: string
  name: string
  email: string
  status: string
  application_count: number
}>> {
  const supabase = createAdminClient()
  const result = new Map<string, { id: string; name: string; email: string; status: string; application_count: number }>()

  if (emails.length === 0) return result

  // Normalize emails for lookup
  const normalizedEmails = emails.map(e => e.toLowerCase().trim())

  // Supabase has a limit on IN clause, process in chunks of 500
  const emailChunks = chunk(normalizedEmails, 500)

  for (const emailChunk of emailChunks) {
    const { data, error } = await supabase
      .from('providers')
      .select('id, name, email, status, application_count')
      .in('email', emailChunk)

    if (error) {
      console.error('Error batch checking duplicates:', error)
      continue
    }

    if (data) {
      for (const provider of data) {
        result.set(provider.email.toLowerCase(), {
          id: provider.id,
          name: provider.name,
          email: provider.email,
          status: provider.status,
          application_count: provider.application_count || 0,
        })
      }
    }
  }

  return result
}

/**
 * Verifica se já existe um provider com o mesmo email (legacy - kept for compatibility)
 */
async function checkDuplicate(email: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('providers')
    .select('id, name, email, status, application_count')
    .eq('email', email.toLowerCase())
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found (não é erro)
    console.error('Error checking duplicate:', error)
  }

  return data || null
}

/**
 * Cria um novo provider
 */
async function createProvider(provider: ParsedProvider): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Buscar RM padrão para novos prestadores
  const { data: defaultOwnerSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'default_new_provider_owner_id')
    .single()

  let defaultOwnerId: string | null = null
  if (defaultOwnerSetting?.value) {
    const val = String(defaultOwnerSetting.value)
    // Remover aspas se for string JSON
    defaultOwnerId = val.startsWith('"') && val.endsWith('"') ? val.slice(1, -1) : val
    if (defaultOwnerId === 'null' || !defaultOwnerId) {
      defaultOwnerId = null
    }
  }

  const insertData: ProviderInsert = {
    name: provider.name,
    email: provider.email,
    entity_type: provider.entity_type,
    status: 'novo',
    relationship_owner_id: defaultOwnerId,
    phone: provider.phone || null,
    nif: provider.nif || null,
    website: provider.website || null,
    services: provider.services || null,
    districts: provider.districts || null,
    num_technicians: provider.num_technicians || null,
    has_admin_team: provider.has_admin_team ?? null,
    has_own_transport: provider.has_own_transport ?? null,
    working_hours: provider.working_hours || null,
    application_count: 1,
    first_application_at: provider.first_application_at || new Date().toISOString(),
  }

  const { error } = await supabase.from('providers').insert(insertData)

  if (error) {
    console.error('Error creating provider:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Atualiza um provider existente (incrementa application_count e atualiza dados)
 */
async function updateProvider(
  providerId: string,
  provider: ParsedProvider,
  currentAppCount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('providers')
    .update({
      name: provider.name,
      phone: provider.phone || null,
      nif: provider.nif || null,
      website: provider.website || null,
      services: provider.services || null,
      districts: provider.districts || null,
      num_technicians: provider.num_technicians || null,
      has_admin_team: provider.has_admin_team ?? null,
      has_own_transport: provider.has_own_transport ?? null,
      working_hours: provider.working_hours || null,
      application_count: currentAppCount + 1,
    })
    .eq('id', providerId)

  if (error) {
    console.error('Error updating provider:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Check for duplicates in batch (primeira passagem) - OPTIMIZED
 * Uses single batch query instead of N queries
 */
export async function checkDuplicates(providers: ParsedProvider[]): Promise<{
  duplicates: DuplicateProvider[]
  nonDuplicates: ParsedProvider[]
}> {
  const duplicates: DuplicateProvider[] = []
  const nonDuplicates: ParsedProvider[] = []

  // Extract all emails from providers
  const emails = providers.map(p => p.email)

  // Single batch query to check all emails
  const existingMap = await batchCheckDuplicates(emails)

  // Categorize providers based on existing data
  for (const provider of providers) {
    const normalizedEmail = provider.email.toLowerCase().trim()
    const existing = existingMap.get(normalizedEmail)

    if (existing) {
      duplicates.push({
        parsed: provider,
        existing,
      })
    } else {
      nonDuplicates.push(provider)
    }
  }

  return { duplicates, nonDuplicates }
}

/**
 * Importa providers sem verificar duplicados (usado após user resolver duplicados) - OPTIMIZED
 * Uses batch insert in chunks for better performance
 */
export async function importProvidersWithoutDuplicateCheck(
  providers: ParsedProvider[]
): Promise<ImportResult> {
  const supabase = createAdminClient()
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  if (providers.length === 0) {
    return result
  }

  // Fetch default owner once (not per provider)
  const { data: defaultOwnerSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'default_new_provider_owner_id')
    .single()

  let defaultOwnerId: string | null = null
  if (defaultOwnerSetting?.value) {
    const val = String(defaultOwnerSetting.value)
    defaultOwnerId = val.startsWith('"') && val.endsWith('"') ? val.slice(1, -1) : val
    if (defaultOwnerId === 'null' || !defaultOwnerId) {
      defaultOwnerId = null
    }
  }

  // Prepare all insert data
  const insertData: ProviderInsert[] = providers.map(provider => ({
    name: provider.name,
    email: provider.email,
    entity_type: provider.entity_type,
    status: 'novo',
    relationship_owner_id: defaultOwnerId,
    phone: provider.phone || null,
    nif: provider.nif || null,
    website: provider.website || null,
    services: provider.services || null,
    districts: provider.districts || null,
    num_technicians: provider.num_technicians || null,
    has_admin_team: provider.has_admin_team ?? null,
    has_own_transport: provider.has_own_transport ?? null,
    working_hours: provider.working_hours || null,
    application_count: 1,
    first_application_at: provider.first_application_at || new Date().toISOString(),
  }))

  // Batch insert in chunks of 100 (Supabase performs well with this size)
  const BATCH_SIZE = 100
  const chunks_to_insert = chunk(insertData, BATCH_SIZE)
  const providerChunks = chunk(providers, BATCH_SIZE)

  for (let i = 0; i < chunks_to_insert.length; i++) {
    const insertChunk = chunks_to_insert[i]
    const providerChunk = providerChunks[i]

    const { error } = await supabase.from('providers').insert(insertChunk)

    if (error) {
      console.error('Error batch inserting providers:', error)
      // If batch fails, try individual inserts to identify which ones failed
      for (const provider of providerChunk) {
        const singleInsert: ProviderInsert = {
          name: provider.name,
          email: provider.email,
          entity_type: provider.entity_type,
          status: 'novo',
          relationship_owner_id: defaultOwnerId,
          phone: provider.phone || null,
          nif: provider.nif || null,
          website: provider.website || null,
          services: provider.services || null,
          districts: provider.districts || null,
          num_technicians: provider.num_technicians || null,
          has_admin_team: provider.has_admin_team ?? null,
          has_own_transport: provider.has_own_transport ?? null,
          working_hours: provider.working_hours || null,
          application_count: 1,
          first_application_at: provider.first_application_at || new Date().toISOString(),
        }
        const { error: singleError } = await supabase.from('providers').insert(singleInsert)
        if (singleError) {
          result.errors.push({ provider, error: singleError.message })
        } else {
          result.created++
        }
      }
    } else {
      result.created += insertChunk.length
    }
  }

  revalidatePath('/prestadores')
  revalidatePath('/candidaturas')

  return result
}

/**
 * Atualiza providers duplicados (usado quando user escolhe "atualizar") - OPTIMIZED
 * Uses parallel updates in chunks for better performance
 */
export async function updateDuplicateProviders(
  duplicates: DuplicateProvider[]
): Promise<ImportResult> {
  const supabase = createAdminClient()
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  if (duplicates.length === 0) {
    return result
  }

  // Process updates in parallel chunks of 10
  const CHUNK_SIZE = 10
  const duplicateChunks = chunk(duplicates, CHUNK_SIZE)

  for (const duplicateChunk of duplicateChunks) {
    const updatePromises = duplicateChunk.map(async (duplicate) => {
      const { error } = await supabase
        .from('providers')
        .update({
          name: duplicate.parsed.name,
          phone: duplicate.parsed.phone || null,
          nif: duplicate.parsed.nif || null,
          website: duplicate.parsed.website || null,
          services: duplicate.parsed.services || null,
          districts: duplicate.parsed.districts || null,
          num_technicians: duplicate.parsed.num_technicians || null,
          has_admin_team: duplicate.parsed.has_admin_team ?? null,
          has_own_transport: duplicate.parsed.has_own_transport ?? null,
          working_hours: duplicate.parsed.working_hours || null,
          application_count: duplicate.existing.application_count + 1,
        })
        .eq('id', duplicate.existing.id)

      return { duplicate, error }
    })

    const results = await Promise.all(updatePromises)

    for (const { duplicate, error } of results) {
      if (error) {
        result.errors.push({
          provider: duplicate.parsed,
          error: error.message,
        })
      } else {
        result.updated++
      }
    }
  }

  revalidatePath('/prestadores')
  revalidatePath('/candidaturas')

  return result
}

/**
 * Importa providers com verificação de duplicados (fluxo completo) - OPTIMIZED
 * Uses batch operations for both duplicate detection and inserts/updates
 */
export async function importProviders(
  providers: ParsedProvider[],
  duplicateAction: 'skip' | 'update' | 'ask' = 'ask'
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  // Primeira passagem: detectar duplicados (OPTIMIZED - single batch query)
  const { duplicates, nonDuplicates } = await checkDuplicates(providers)

  // Se há duplicados e action é 'ask', retornar para user decidir
  if (duplicates.length > 0 && duplicateAction === 'ask') {
    result.duplicates = duplicates
    return result
  }

  // Processar não-duplicados com batch insert (OPTIMIZED)
  if (nonDuplicates.length > 0) {
    const createResult = await importProvidersWithoutDuplicateCheck(nonDuplicates)
    result.created = createResult.created
    result.errors.push(...createResult.errors)
  }

  // Processar duplicados baseado na action
  if (duplicates.length > 0) {
    if (duplicateAction === 'skip') {
      result.skipped = duplicates.length
    } else if (duplicateAction === 'update') {
      // Use optimized parallel update function
      const updateResult = await updateDuplicateProviders(duplicates)
      result.updated = updateResult.updated
      result.errors.push(...updateResult.errors)
    }
  }

  // Already revalidated in the sub-functions, but ensure it's done
  revalidatePath('/prestadores')
  revalidatePath('/candidaturas')

  return result
}
