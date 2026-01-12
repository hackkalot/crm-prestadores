'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type Provider = Database['public']['Tables']['providers']['Row']

// Types for duplicate detection
export interface DuplicateGroup {
  matchType: 'email' | 'nif' | 'name'
  matchValue: string
  similarity?: number // Only for name matches
  providers: Provider[]
}

export interface DuplicateScanResult {
  groups: DuplicateGroup[]
  totalDuplicates: number
  scannedProviders: number
}

// Levenshtein distance for fuzzy name matching
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 100

  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 100

  const distance = levenshteinDistance(s1, s2)
  return Math.round((1 - distance / maxLen) * 100)
}

// Normalize name for comparison (remove accents, lowercase, trim)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Check if a value is masked (contains only asterisks or is mostly asterisks)
// Used to skip archived providers whose data has been anonymized
function isMaskedValue(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (trimmed.length === 0) return false
  // Check if the value is entirely asterisks
  return /^\*+$/.test(trimmed)
}

/**
 * Scan database for potential duplicates
 * Detection order: email (exact) -> NIF (exact) -> name (fuzzy 85%)
 */
export async function scanForDuplicates(): Promise<DuplicateScanResult> {
  const admin = createAdminClient()

  // Get all providers (bypass default 1000 limit with range)
  const { data: providers, error } = await admin
    .from('providers')
    .select('*')
    .order('created_at', { ascending: true })
    .range(0, 10000)

  if (error) {
    console.error('Error fetching providers:', error)
    throw new Error('Erro ao buscar prestadores')
  }

  if (!providers || providers.length === 0) {
    return { groups: [], totalDuplicates: 0, scannedProviders: 0 }
  }

  const groups: DuplicateGroup[] = []
  const processedIds = new Set<string>()

  // 1. Find email duplicates (exact match)
  const emailMap = new Map<string, Provider[]>()
  for (const provider of providers) {
    if (provider.email && !isMaskedValue(provider.email)) {
      const email = provider.email.toLowerCase().trim()
      if (!emailMap.has(email)) {
        emailMap.set(email, [])
      }
      emailMap.get(email)!.push(provider)
    }
  }

  for (const [email, emailProviders] of emailMap) {
    if (emailProviders.length > 1) {
      groups.push({
        matchType: 'email',
        matchValue: email,
        providers: emailProviders,
      })
      emailProviders.forEach(p => processedIds.add(p.id))
    }
  }

  // 2. Find NIF duplicates (exact match) - only for providers not already in a group
  const nifMap = new Map<string, Provider[]>()
  for (const provider of providers) {
    if (processedIds.has(provider.id)) continue
    if (provider.nif && !isMaskedValue(provider.nif)) {
      const nif = provider.nif.trim()
      if (!nifMap.has(nif)) {
        nifMap.set(nif, [])
      }
      nifMap.get(nif)!.push(provider)
    }
  }

  for (const [nif, nifProviders] of nifMap) {
    if (nifProviders.length > 1) {
      groups.push({
        matchType: 'nif',
        matchValue: nif,
        providers: nifProviders,
      })
      nifProviders.forEach(p => processedIds.add(p.id))
    }
  }

  // 3. Find name duplicates (fuzzy match 85%) - only for providers not already in a group
  const remainingProviders = providers.filter(p => !processedIds.has(p.id) && !isMaskedValue(p.name))
  const nameGroups: Map<string, { providers: Provider[], similarity: number }> = new Map()

  for (let i = 0; i < remainingProviders.length; i++) {
    const providerA = remainingProviders[i]
    if (processedIds.has(providerA.id)) continue

    const normalizedNameA = normalizeName(providerA.name)
    const matchingProviders: Provider[] = [providerA]
    let minSimilarity = 100

    for (let j = i + 1; j < remainingProviders.length; j++) {
      const providerB = remainingProviders[j]
      if (processedIds.has(providerB.id)) continue

      const normalizedNameB = normalizeName(providerB.name)
      const similarity = calculateSimilarity(normalizedNameA, normalizedNameB)

      if (similarity >= 85) {
        matchingProviders.push(providerB)
        minSimilarity = Math.min(minSimilarity, similarity)
        processedIds.add(providerB.id)
      }
    }

    if (matchingProviders.length > 1) {
      processedIds.add(providerA.id)
      groups.push({
        matchType: 'name',
        matchValue: providerA.name,
        similarity: minSimilarity,
        providers: matchingProviders,
      })
    }
  }

  // Calculate total duplicates (providers that would be removed after merge)
  const totalDuplicates = groups.reduce((acc, group) => acc + group.providers.length - 1, 0)

  return {
    groups,
    totalDuplicates,
    scannedProviders: providers.length,
  }
}

/**
 * Get full details of two providers for merge comparison
 */
export async function getProvidersForMerge(providerAId: string, providerBId: string) {
  const supabase = await createClient()

  const [providerAResult, providerBResult] = await Promise.all([
    supabase
      .from('providers')
      .select(`
        *,
        relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email),
        notes:notes(count),
        history:history_log(count),
        onboarding_card:onboarding_cards(id),
        prices:provider_prices(count)
      `)
      .eq('id', providerAId)
      .single(),
    supabase
      .from('providers')
      .select(`
        *,
        relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email),
        notes:notes(count),
        history:history_log(count),
        onboarding_card:onboarding_cards(id),
        prices:provider_prices(count)
      `)
      .eq('id', providerBId)
      .single(),
  ])

  if (providerAResult.error || providerBResult.error) {
    throw new Error('Erro ao buscar prestadores para merge')
  }

  return {
    providerA: providerAResult.data,
    providerB: providerBResult.data,
  }
}

// Types for merge
export interface MergeFieldSelection {
  name: 'A' | 'B'
  email: 'A' | 'B'
  phone: 'A' | 'B'
  nif: 'A' | 'B'
  entity_type: 'A' | 'B'
  website: 'A' | 'B'
  services: 'A' | 'B' | 'merge'
  districts: 'A' | 'B' | 'merge'
  num_technicians: 'A' | 'B'
  has_admin_team: 'A' | 'B'
  has_own_transport: 'A' | 'B'
  working_hours: 'A' | 'B'
  status: 'A' | 'B'
  relationship_owner_id: 'A' | 'B'
}

export interface MergeResult {
  success: boolean
  mergedProviderId?: string
  deletedProviderId?: string
  error?: string
}

/**
 * Merge two providers into one
 * Provider A is kept, Provider B is deleted
 * All relationships from B are transferred to A
 */
export async function mergeProviders(
  providerAId: string,
  providerBId: string,
  fieldSelections: MergeFieldSelection
): Promise<MergeResult> {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Get current user for history log
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Não autenticado' }
  }

  // Fetch both providers
  const [providerAResult, providerBResult] = await Promise.all([
    admin.from('providers').select('*').eq('id', providerAId).single(),
    admin.from('providers').select('*').eq('id', providerBId).single(),
  ])

  if (providerAResult.error || providerBResult.error) {
    return { success: false, error: 'Erro ao buscar prestadores' }
  }

  const providerA = providerAResult.data
  const providerB = providerBResult.data

  // Build merged provider data based on selections
  const getValue = <K extends keyof Provider>(field: K, selection: 'A' | 'B'): Provider[K] => {
    return selection === 'A' ? providerA[field] : providerB[field]
  }

  const mergedData: Partial<Provider> = {
    name: getValue('name', fieldSelections.name),
    email: getValue('email', fieldSelections.email),
    phone: getValue('phone', fieldSelections.phone),
    nif: getValue('nif', fieldSelections.nif),
    entity_type: getValue('entity_type', fieldSelections.entity_type),
    website: getValue('website', fieldSelections.website),
    num_technicians: getValue('num_technicians', fieldSelections.num_technicians),
    has_admin_team: getValue('has_admin_team', fieldSelections.has_admin_team),
    has_own_transport: getValue('has_own_transport', fieldSelections.has_own_transport),
    working_hours: getValue('working_hours', fieldSelections.working_hours),
    status: getValue('status', fieldSelections.status),
    relationship_owner_id: getValue('relationship_owner_id', fieldSelections.relationship_owner_id),
  }

  // Handle array fields (services, districts)
  if (fieldSelections.services === 'merge') {
    const servicesA = providerA.services || []
    const servicesB = providerB.services || []
    mergedData.services = [...new Set([...servicesA, ...servicesB])]
  } else {
    mergedData.services = getValue('services', fieldSelections.services)
  }

  if (fieldSelections.districts === 'merge') {
    const districtsA = providerA.districts || []
    const districtsB = providerB.districts || []
    mergedData.districts = [...new Set([...districtsA, ...districtsB])]
  } else {
    mergedData.districts = getValue('districts', fieldSelections.districts)
  }

  // Combine application counts
  mergedData.application_count = (providerA.application_count || 0) + (providerB.application_count || 0)

  // Use earliest first_application_at
  if (providerA.first_application_at && providerB.first_application_at) {
    mergedData.first_application_at = new Date(providerA.first_application_at) < new Date(providerB.first_application_at)
      ? providerA.first_application_at
      : providerB.first_application_at
  } else {
    mergedData.first_application_at = providerA.first_application_at || providerB.first_application_at
  }

  try {
    // 1. Update Provider A with merged data
    const { error: updateError } = await admin
      .from('providers')
      .update(mergedData)
      .eq('id', providerAId)

    if (updateError) throw updateError

    // 2. Transfer all relationships from B to A
    // Notes
    await admin
      .from('notes')
      .update({ provider_id: providerAId })
      .eq('provider_id', providerBId)

    // History log
    await admin
      .from('history_log')
      .update({ provider_id: providerAId })
      .eq('provider_id', providerBId)

    // Application history
    await admin
      .from('application_history')
      .update({ provider_id: providerAId })
      .eq('provider_id', providerBId)

    // Alerts
    await admin
      .from('alerts')
      .update({ provider_id: providerAId })
      .eq('provider_id', providerBId)

    // Provider documents
    await admin
      .from('provider_documents')
      .update({ provider_id: providerAId })
      .eq('provider_id', providerBId)

    // Provider prices
    await admin
      .from('provider_prices')
      .update({ provider_id: providerAId })
      .eq('provider_id', providerBId)

    // Provider price snapshots
    await admin
      .from('provider_price_snapshots')
      .update({ provider_id: providerAId })
      .eq('provider_id', providerBId)

    // Provider services
    await admin
      .from('provider_services')
      .update({ provider_id: providerAId })
      .eq('provider_id', providerBId)

    // Priority progress log
    await admin
      .from('priority_progress_log')
      .update({ provider_id: providerAId })
      .eq('provider_id', providerBId)

    // Onboarding cards - this is trickier, we need to handle if both have cards
    const { data: cardB } = await admin
      .from('onboarding_cards')
      .select('id')
      .eq('provider_id', providerBId)
      .single()

    if (cardB) {
      // Check if A also has a card
      const { data: cardA } = await admin
        .from('onboarding_cards')
        .select('id')
        .eq('provider_id', providerAId)
        .single()

      if (cardA) {
        // Both have cards - transfer tasks from B's card to A's card, then delete B's card
        await admin
          .from('onboarding_tasks')
          .update({ card_id: cardA.id })
          .eq('card_id', cardB.id)

        await admin
          .from('onboarding_cards')
          .delete()
          .eq('id', cardB.id)
      } else {
        // Only B has card - transfer it to A
        await admin
          .from('onboarding_cards')
          .update({ provider_id: providerAId })
          .eq('id', cardB.id)
      }
    }

    // 3. Add history log entry for the merge
    await admin.from('history_log').insert({
      provider_id: providerAId,
      event_type: 'outros',
      description: `Prestador fundido com outro registo (ID: ${providerBId})`,
      created_by: user.id,
      old_value: { merged_provider: providerB },
      new_value: { merged_fields: fieldSelections },
    })

    // 4. Delete Provider B
    const { error: deleteError } = await admin
      .from('providers')
      .delete()
      .eq('id', providerBId)

    if (deleteError) throw deleteError

    // Revalidate paths
    revalidatePath('/prestadores')
    revalidatePath('/candidaturas')
    revalidatePath('/onboarding')
    revalidatePath(`/providers/${providerAId}`)

    return {
      success: true,
      mergedProviderId: providerAId,
      deletedProviderId: providerBId,
    }
  } catch (error) {
    console.error('Error merging providers:', error)
    return { success: false, error: 'Erro ao fundir prestadores' }
  }
}

// Types for quick merge
export interface QuickMergeResult {
  success: boolean
  mergedCount: number
  failedCount: number
  error?: string
}

// Merge operation structure for batch processing
interface MergeOperation {
  targetId: string
  sourceId: string
  mergedData: Partial<Provider>
  matchType: 'email' | 'nif'
  sourceEmail: string | null
  sourceNif: string | null
  sourceName: string
}

/**
 * Quick merge all exact match duplicates (email and NIF only)
 * OPTIMIZED VERSION with:
 * - Parallel relationship transfers
 * - Batch processing in chunks
 * - Concurrent group processing
 *
 * Rules:
 * - Keep data from oldest provider (by created_at)
 * - If field is empty in oldest, use value from newer provider
 * - For arrays (services, districts): merge both
 */
export async function quickMergeExactDuplicates(): Promise<QuickMergeResult> {
  const admin = createAdminClient()
  const supabase = await createClient()

  // Get current user for history log
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, mergedCount: 0, failedCount: 0, error: 'Não autenticado' }
  }

  // Get all providers ordered by created_at (oldest first)
  const { data: providers, error } = await admin
    .from('providers')
    .select('*')
    .order('created_at', { ascending: true })
    .range(0, 10000)

  if (error || !providers) {
    return { success: false, mergedCount: 0, failedCount: 0, error: 'Erro ao buscar prestadores' }
  }

  // Find email duplicates (only exact matches, skip masked values)
  const emailGroups = new Map<string, Provider[]>()
  for (const provider of providers) {
    if (provider.email && !isMaskedValue(provider.email)) {
      const email = provider.email.toLowerCase().trim()
      if (!emailGroups.has(email)) {
        emailGroups.set(email, [])
      }
      emailGroups.get(email)!.push(provider)
    }
  }

  // Find NIF duplicates (only exact matches, skip masked values and already processed by email)
  const processedByEmail = new Set<string>()
  for (const [, emailProviders] of emailGroups) {
    if (emailProviders.length > 1) {
      emailProviders.forEach(p => processedByEmail.add(p.id))
    }
  }

  const nifGroups = new Map<string, Provider[]>()
  for (const provider of providers) {
    if (processedByEmail.has(provider.id)) continue
    if (provider.nif && !isMaskedValue(provider.nif)) {
      const nif = provider.nif.trim()
      if (!nifGroups.has(nif)) {
        nifGroups.set(nif, [])
      }
      nifGroups.get(nif)!.push(provider)
    }
  }

  // Prepare all merge operations upfront
  const allMergeOps: MergeOperation[] = []

  const prepareMergeOps = (groupProviders: Provider[], matchType: 'email' | 'nif') => {
    // Sort by created_at ascending (oldest first)
    const sorted = [...groupProviders].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    )

    const target = sorted[0]
    const toMerge = sorted.slice(1)

    for (const source of toMerge) {
      // Build merged data - prefer target (oldest) values, fallback to source if empty
      const getValue = <K extends keyof Provider>(field: K): Provider[K] => {
        const targetValue = target[field]
        const sourceValue = source[field]
        if (targetValue !== null && targetValue !== undefined && targetValue !== '') {
          return targetValue
        }
        return sourceValue
      }

      const mergedData: Partial<Provider> = {
        name: getValue('name'),
        email: getValue('email'),
        phone: getValue('phone'),
        nif: getValue('nif'),
        entity_type: getValue('entity_type'),
        website: getValue('website'),
        num_technicians: getValue('num_technicians'),
        has_admin_team: getValue('has_admin_team'),
        has_own_transport: getValue('has_own_transport'),
        working_hours: getValue('working_hours'),
        status: getValue('status'),
        relationship_owner_id: getValue('relationship_owner_id'),
      }

      // Merge arrays
      const targetServices = target.services || []
      const sourceServices = source.services || []
      mergedData.services = [...new Set([...targetServices, ...sourceServices])]

      const targetDistricts = target.districts || []
      const sourceDistricts = source.districts || []
      mergedData.districts = [...new Set([...targetDistricts, ...sourceDistricts])]

      // Combine application counts
      mergedData.application_count = (target.application_count || 0) + (source.application_count || 0)

      // Use earliest first_application_at
      if (target.first_application_at && source.first_application_at) {
        mergedData.first_application_at = new Date(target.first_application_at) < new Date(source.first_application_at)
          ? target.first_application_at
          : source.first_application_at
      } else {
        mergedData.first_application_at = target.first_application_at || source.first_application_at
      }

      allMergeOps.push({
        targetId: target.id,
        sourceId: source.id,
        mergedData,
        matchType,
        sourceEmail: source.email,
        sourceNif: source.nif,
        sourceName: source.name,
      })
    }
  }

  // Prepare email merge operations
  for (const [, emailProviders] of emailGroups) {
    if (emailProviders.length > 1) {
      prepareMergeOps(emailProviders, 'email')
    }
  }

  // Prepare NIF merge operations
  for (const [, nifProviders] of nifGroups) {
    if (nifProviders.length > 1) {
      prepareMergeOps(nifProviders, 'nif')
    }
  }

  let mergedCount = 0
  let failedCount = 0

  // Process a single merge with parallel relationship transfers
  const processMerge = async (op: MergeOperation): Promise<boolean> => {
    try {
      // Update target with merged data
      await admin.from('providers').update(op.mergedData).eq('id', op.targetId)

      // Transfer all relationships in PARALLEL (major speedup!)
      await Promise.all([
        admin.from('notes').update({ provider_id: op.targetId }).eq('provider_id', op.sourceId),
        admin.from('history_log').update({ provider_id: op.targetId }).eq('provider_id', op.sourceId),
        admin.from('application_history').update({ provider_id: op.targetId }).eq('provider_id', op.sourceId),
        admin.from('alerts').update({ provider_id: op.targetId }).eq('provider_id', op.sourceId),
        admin.from('provider_documents').update({ provider_id: op.targetId }).eq('provider_id', op.sourceId),
        admin.from('provider_prices').update({ provider_id: op.targetId }).eq('provider_id', op.sourceId),
        admin.from('provider_price_snapshots').update({ provider_id: op.targetId }).eq('provider_id', op.sourceId),
        admin.from('provider_services').update({ provider_id: op.targetId }).eq('provider_id', op.sourceId),
        admin.from('priority_progress_log').update({ provider_id: op.targetId }).eq('provider_id', op.sourceId),
      ])

      // Handle onboarding cards (must be sequential due to dependencies)
      const { data: sourceCard } = await admin
        .from('onboarding_cards')
        .select('id')
        .eq('provider_id', op.sourceId)
        .single()

      if (sourceCard) {
        const { data: targetCard } = await admin
          .from('onboarding_cards')
          .select('id')
          .eq('provider_id', op.targetId)
          .single()

        if (targetCard) {
          await admin.from('onboarding_tasks').update({ card_id: targetCard.id }).eq('card_id', sourceCard.id)
          await admin.from('onboarding_cards').delete().eq('id', sourceCard.id)
        } else {
          await admin.from('onboarding_cards').update({ provider_id: op.targetId }).eq('id', sourceCard.id)
        }
      }

      // Add history log entry and delete source in parallel
      await Promise.all([
        admin.from('history_log').insert({
          provider_id: op.targetId,
          event_type: 'outros',
          description: `Quick merge: fundido com prestador duplicado (${op.matchType}: ${op.matchType === 'email' ? op.sourceEmail : op.sourceNif})`,
          created_by: user.id,
          old_value: { merged_provider_id: op.sourceId, merged_provider_name: op.sourceName },
          new_value: { match_type: op.matchType },
        }),
        admin.from('providers').delete().eq('id', op.sourceId),
      ])

      return true
    } catch (err) {
      console.error(`Failed to merge provider ${op.sourceId} into ${op.targetId}:`, err)
      return false
    }
  }

  // Process merges in parallel chunks (5 concurrent merges at a time)
  const CHUNK_SIZE = 5
  for (let i = 0; i < allMergeOps.length; i += CHUNK_SIZE) {
    const chunk = allMergeOps.slice(i, i + CHUNK_SIZE)
    const results = await Promise.all(chunk.map(processMerge))

    results.forEach(success => {
      if (success) mergedCount++
      else failedCount++
    })
  }

  // Revalidate paths
  revalidatePath('/prestadores')
  revalidatePath('/candidaturas')
  revalidatePath('/onboarding')

  return {
    success: true,
    mergedCount,
    failedCount,
  }
}
