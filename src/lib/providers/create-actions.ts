'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type ProviderInsert = Database['public']['Tables']['providers']['Insert']
type EntityType = Database['public']['Enums']['entity_type']

export interface CreateProviderInput {
  // Obrigatórios
  name: string
  email: string
  entity_type: EntityType

  // Opcionais
  phone?: string
  nif?: string
  website?: string
  services?: string[]
  districts?: string[]
  num_technicians?: number
  has_admin_team?: boolean
  has_own_transport?: boolean
  working_hours?: string
}

export interface CreateProviderResult {
  success: boolean
  provider_id?: string
  error?: string
  is_duplicate?: boolean
}

/**
 * Verifica se já existe um provider com o mesmo email
 */
async function checkEmailExists(email: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('providers')
    .select('id')
    .eq('email', email.toLowerCase())
    .limit(1)
    .single()

  return !!data
}

/**
 * Cria um novo provider manualmente
 */
export async function createProvider(
  _prevState: any,
  formData: FormData
): Promise<CreateProviderResult> {
  try {
    // Parse form data
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const entity_type = formData.get('entity_type') as EntityType
    const phone = formData.get('phone') as string | null
    const nif = formData.get('nif') as string | null
    const website = formData.get('website') as string | null
    const working_hours = formData.get('working_hours') as string | null

    // Parse arrays
    const servicesRaw = formData.get('services') as string
    const services = servicesRaw ? JSON.parse(servicesRaw) : null

    // Concelhos (cobertura geográfica)
    const countiesRaw = formData.get('counties') as string
    const counties = countiesRaw ? JSON.parse(countiesRaw) : null

    // Parse numbers
    const num_technicians_raw = formData.get('num_technicians') as string
    const num_technicians = num_technicians_raw ? parseInt(num_technicians_raw) : null

    // Parse booleans
    const has_admin_team_raw = formData.get('has_admin_team') as string
    const has_admin_team = has_admin_team_raw === 'true' ? true : has_admin_team_raw === 'false' ? false : null

    const has_own_transport_raw = formData.get('has_own_transport') as string
    const has_own_transport = has_own_transport_raw === 'true' ? true : has_own_transport_raw === 'false' ? false : null

    // Validações
    if (!name || !email || !entity_type) {
      return {
        success: false,
        error: 'Nome, email e tipo de entidade são obrigatórios',
      }
    }

    // Validar email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Email inválido',
      }
    }

    // Verificar duplicado
    const isDuplicate = await checkEmailExists(email)
    if (isDuplicate) {
      return {
        success: false,
        error: 'Já existe um prestador com este email',
        is_duplicate: true,
      }
    }

    // Criar provider
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
      name: name.trim(),
      email: email.toLowerCase().trim(),
      entity_type,
      status: 'novo',
      relationship_owner_id: defaultOwnerId,
      phone: phone?.trim() || null,
      nif: nif?.trim() || null,
      website: website?.trim() || null,
      services,
      counties,  // Concelhos selecionados
      num_technicians,
      has_admin_team,
      has_own_transport,
      working_hours: working_hours?.trim() || null,
      application_count: 1,
      first_application_at: new Date().toISOString(),
    }

    const { data: newProvider, error: insertError } = await supabase
      .from('providers')
      .insert(insertData)
      .select('id')
      .single()

    if (insertError || !newProvider) {
      console.error('Error creating provider:', insertError)
      return {
        success: false,
        error: 'Erro ao criar prestador',
      }
    }

    // Revalidate
    revalidatePath('/prestadores')
    revalidatePath('/candidaturas')

    return {
      success: true,
      provider_id: newProvider.id,
    }
  } catch (error) {
    console.error('Error in createProvider:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
