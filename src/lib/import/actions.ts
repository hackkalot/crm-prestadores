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

/**
 * Verifica se já existe um provider com o mesmo email
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

  const insertData: ProviderInsert = {
    name: provider.name,
    email: provider.email,
    entity_type: provider.entity_type,
    status: 'novo',
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
 * Check for duplicates in batch (primeira passagem)
 */
export async function checkDuplicates(providers: ParsedProvider[]): Promise<{
  duplicates: DuplicateProvider[]
  nonDuplicates: ParsedProvider[]
}> {
  const duplicates: DuplicateProvider[] = []
  const nonDuplicates: ParsedProvider[] = []

  for (const provider of providers) {
    const existing = await checkDuplicate(provider.email)

    if (existing) {
      duplicates.push({
        parsed: provider,
        existing: {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          status: existing.status,
          application_count: existing.application_count || 0,
        },
      })
    } else {
      nonDuplicates.push(provider)
    }
  }

  return { duplicates, nonDuplicates }
}

/**
 * Importa providers sem verificar duplicados (usado após user resolver duplicados)
 */
export async function importProvidersWithoutDuplicateCheck(
  providers: ParsedProvider[]
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  for (const provider of providers) {
    const createResult = await createProvider(provider)

    if (createResult.success) {
      result.created++
    } else {
      result.errors.push({
        provider,
        error: createResult.error || 'Erro desconhecido',
      })
    }
  }

  revalidatePath('/prestadores')
  revalidatePath('/candidaturas')

  return result
}

/**
 * Atualiza providers duplicados (usado quando user escolhe "atualizar")
 */
export async function updateDuplicateProviders(
  duplicates: DuplicateProvider[]
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  for (const duplicate of duplicates) {
    const updateResult = await updateProvider(
      duplicate.existing.id,
      duplicate.parsed,
      duplicate.existing.application_count
    )

    if (updateResult.success) {
      result.updated++
    } else {
      result.errors.push({
        provider: duplicate.parsed,
        error: updateResult.error || 'Erro desconhecido',
      })
    }
  }

  revalidatePath('/prestadores')
  revalidatePath('/candidaturas')

  return result
}

/**
 * Importa providers com verificação de duplicados (fluxo completo)
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

  // Primeira passagem: detectar duplicados
  const { duplicates, nonDuplicates } = await checkDuplicates(providers)

  // Se há duplicados e action é 'ask', retornar para user decidir
  if (duplicates.length > 0 && duplicateAction === 'ask') {
    result.duplicates = duplicates
    return result
  }

  // Processar não-duplicados (sempre criar)
  for (const provider of nonDuplicates) {
    const createResult = await createProvider(provider)

    if (createResult.success) {
      result.created++
    } else {
      result.errors.push({
        provider,
        error: createResult.error || 'Erro desconhecido',
      })
    }
  }

  // Processar duplicados baseado na action
  if (duplicates.length > 0) {
    if (duplicateAction === 'skip') {
      result.skipped = duplicates.length
    } else if (duplicateAction === 'update') {
      for (const duplicate of duplicates) {
        const updateResult = await updateProvider(
          duplicate.existing.id,
          duplicate.parsed,
          duplicate.existing.application_count
        )

        if (updateResult.success) {
          result.updated++
        } else {
          result.errors.push({
            provider: duplicate.parsed,
            error: updateResult.error || 'Erro desconhecido',
          })
        }
      }
    }
  }

  revalidatePath('/prestadores')
  revalidatePath('/candidaturas')

  return result
}
