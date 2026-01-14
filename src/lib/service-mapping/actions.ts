'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getPendingSuggestions() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: [], error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('service_mapping_suggestions')
    .select(
      `
      *,
      taxonomy_1:service_taxonomy!service_mapping_suggestions_suggested_taxonomy_id_1_fkey(id, category, service),
      taxonomy_2:service_taxonomy!service_mapping_suggestions_suggested_taxonomy_id_2_fkey(id, category, service),
      taxonomy_3:service_taxonomy!service_mapping_suggestions_suggested_taxonomy_id_3_fkey(id, category, service)
    `
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching suggestions:', error)
    return { data: [], error: error.message }
  }

  return { data: data || [], error: null }
}

export async function approveSuggestion(
  suggestionId: string,
  taxonomyId: string,
  notes?: string
) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  // 1. Get suggestion details
  const { data: suggestion, error: fetchError } = await admin
    .from('service_mapping_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single()

  if (fetchError || !suggestion) {
    return { error: 'Sugestão não encontrada' }
  }

  // 2. Update suggestion status
  const { error: updateError } = await admin
    .from('service_mapping_suggestions')
    .update({
      status: 'approved',
      approved_taxonomy_id: taxonomyId,
      admin_notes: notes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)

  if (updateError) {
    return { error: updateError.message }
  }

  // 3. Create mapping
  const { error: mappingError } = await admin
    .from('service_mapping')
    .insert({
      provider_service_name: suggestion.provider_service_name,
      taxonomy_service_id: taxonomyId,
      confidence_score: 100,
      match_type: 'manual',
      verified: true,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })

  if (mappingError) {
    return { error: mappingError.message }
  }

  // 4. Record feedback for algorithm learning
  const suggestedWasCorrect =
    taxonomyId === suggestion.suggested_taxonomy_id_1 ||
    taxonomyId === suggestion.suggested_taxonomy_id_2 ||
    taxonomyId === suggestion.suggested_taxonomy_id_3

  await admin.from('service_mapping_feedback').insert({
    provider_service_name: suggestion.provider_service_name,
    suggested_taxonomy_id: suggestion.suggested_taxonomy_id_1,
    actual_taxonomy_id: taxonomyId,
    algorithm_score: suggestion.suggested_score_1 || 0,
    was_correct: suggestedWasCorrect,
    user_id: user.id,
  })

  revalidatePath('/configuracoes/mapeamento-servicos')

  return { success: true }
}

export async function rejectSuggestion(
  suggestionId: string,
  notes?: string
) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('service_mapping_suggestions')
    .update({
      status: 'rejected',
      admin_notes: notes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracoes/mapeamento-servicos')

  return { success: true }
}

export async function markNeedsNewTaxonomy(
  suggestionId: string,
  notes?: string
) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('service_mapping_suggestions')
    .update({
      status: 'needs_new_taxonomy',
      admin_notes: notes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracoes/mapeamento-servicos')

  return { success: true }
}

export async function getAllTaxonomyServices() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: [], error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('service_taxonomy')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('service')

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data || [], error: null }
}

export async function getMappingStats() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  // Total mappings
  const { count: totalMappings } = await admin
    .from('service_mapping')
    .select('*', { count: 'exact', head: true })

  // Verified mappings
  const { count: verifiedMappings } = await admin
    .from('service_mapping')
    .select('*', { count: 'exact', head: true })
    .eq('verified', true)

  // Pending suggestions
  const { count: pendingSuggestions } = await admin
    .from('service_mapping_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // Feedback stats
  const { data: feedbackData } = await admin
    .from('service_mapping_feedback')
    .select('was_correct')

  const correctPredictions = feedbackData?.filter((f) => f.was_correct).length || 0
  const totalFeedback = feedbackData?.length || 0
  const accuracy = totalFeedback > 0 ? (correctPredictions / totalFeedback) * 100 : 0

  return {
    totalMappings: totalMappings || 0,
    verifiedMappings: verifiedMappings || 0,
    pendingSuggestions: pendingSuggestions || 0,
    algorithmAccuracy: Math.round(accuracy),
    totalFeedback,
  }
}
