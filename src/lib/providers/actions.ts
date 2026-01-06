'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getProviderPricingTable } from '@/lib/pricing/actions'
import { getProviderDocuments } from '@/lib/documents/actions'

export async function getProviderComplete(id: string) {
  const supabaseAdmin = createAdminClient()

  // Get provider with relationship owner
  const { data: provider, error } = await supabaseAdmin
    .from('providers')
    .select(`
      *,
      relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !provider) {
    return null
  }

  // Get application history
  const { data: applicationHistory } = await supabaseAdmin
    .from('provider_applications')
    .select('*')
    .eq('provider_id', id)
    .order('applied_at', { ascending: false })

  // Get onboarding card with tasks if exists
  const { data: onboardingCard } = await supabaseAdmin
    .from('onboarding_cards')
    .select(`
      *,
      owner:users!onboarding_cards_owner_id_fkey(id, name, email),
      current_stage:stage_definitions!onboarding_cards_current_stage_id_fkey(id, name, stage_number, display_order),
      tasks:onboarding_tasks(
        *,
        task_definition:task_definitions(
          *,
          stage:stage_definitions(id, name, stage_number, display_order)
        ),
        owner:users!onboarding_tasks_owner_id_fkey(id, name, email)
      )
    `)
    .eq('provider_id', id)
    .single()

  // Get notes
  const { data: notes } = await supabaseAdmin
    .from('notes')
    .select(`
      *,
      user:users!notes_created_by_fkey(id, name, email)
    `)
    .eq('provider_id', id)
    .order('created_at', { ascending: false })

  // Get history
  const { data: history } = await supabaseAdmin
    .from('history_log')
    .select(`
      *,
      user:users!history_log_created_by_fkey(id, name, email)
    `)
    .eq('provider_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Get pricing table if provider is ativo/suspenso
  let pricingTable = null
  if (['ativo', 'suspenso'].includes(provider.status)) {
    pricingTable = await getProviderPricingTable(id)
  }

  // Get documents
  const documents = await getProviderDocuments(id)

  return {
    provider,
    applicationHistory: applicationHistory || [],
    onboardingCard,
    notes: notes || [],
    history: history || [],
    pricingTable,
    documents,
  }
}

export async function getUsers() {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email')
    .order('name')

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return data || []
}
