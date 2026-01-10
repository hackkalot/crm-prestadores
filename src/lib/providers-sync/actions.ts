'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface ProviderSyncLog {
  id: string
  triggered_by: string
  triggered_at: string
  status: 'in_progress' | 'success' | 'error'
  duration_seconds: number | null
  records_processed: number
  records_inserted: number
  records_updated: number
  excel_file_path: string | null
  excel_file_size_kb: number | null
  error_message: string | null
  error_stack: string | null
  created_at: string
  updated_at: string
}

export interface ProviderSyncStats {
  total: number
  success: number
  error: number
  inProgress: number
  lastSync: ProviderSyncLog | null
}

// Get sync logs for providers
export async function getProviderSyncLogs(): Promise<ProviderSyncLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('provider_sync_logs')
    .select('*, users:triggered_by(name, email)')
    .order('triggered_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching provider sync logs:', error)
    return []
  }

  return data as ProviderSyncLog[]
}

// Get sync stats
export async function getProviderSyncStats(): Promise<ProviderSyncStats> {
  const supabase = createAdminClient()

  const [totalRes, successRes, errorRes, inProgressRes, lastSyncRes] = await Promise.all([
    supabase.from('provider_sync_logs').select('*', { count: 'exact', head: true }),
    supabase.from('provider_sync_logs').select('*', { count: 'exact', head: true }).eq('status', 'success'),
    supabase.from('provider_sync_logs').select('*', { count: 'exact', head: true }).eq('status', 'error'),
    supabase.from('provider_sync_logs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('provider_sync_logs').select('*').order('triggered_at', { ascending: false }).limit(1).single(),
  ])

  return {
    total: totalRes.count || 0,
    success: successRes.count || 0,
    error: errorRes.count || 0,
    inProgress: inProgressRes.count || 0,
    lastSync: lastSyncRes.data as ProviderSyncLog | null,
  }
}

// Create a sync log entry
export async function createProviderSyncLog(userId: string): Promise<string | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('provider_sync_logs')
    .insert({
      triggered_by: userId,
      triggered_at: new Date().toISOString(),
      status: 'in_progress',
      records_processed: 0,
      records_inserted: 0,
      records_updated: 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating provider sync log:', error)
    return null
  }

  return data.id
}

// Update sync log
export async function updateProviderSyncLog(
  logId: string,
  updates: Partial<ProviderSyncLog>
): Promise<boolean> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('provider_sync_logs')
    .update(updates)
    .eq('id', logId)

  if (error) {
    console.error('Error updating provider sync log:', error)
    return false
  }

  revalidatePath('/prestadores')
  revalidatePath('/configuracoes/sync-logs')
  return true
}

// Get provider stats summary for dashboard
export async function getProviderBackofficeStats() {
  const supabase = createAdminClient()

  const [
    totalRes,
    activeRes,
    inactiveRes,
    archivedRes,
    withRequestsRes,
  ] = await Promise.all([
    supabase.from('providers').select('*', { count: 'exact', head: true }).not('backoffice_provider_id', 'is', null),
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('backoffice_status', 'Ativo'),
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('backoffice_status', 'Inativo'),
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('backoffice_status', 'Arquivado'),
    supabase.from('providers').select('*', { count: 'exact', head: true }).gt('total_requests', 0),
  ])

  // Get total requests and average rating
  const { data: statsData } = await supabase
    .from('providers')
    .select('total_requests, completed_requests, service_rating')
    .not('backoffice_provider_id', 'is', null)

  const totalRequests = statsData?.reduce((sum, p) => sum + (p.total_requests || 0), 0) || 0
  const completedRequests = statsData?.reduce((sum, p) => sum + (p.completed_requests || 0), 0) || 0
  const ratingsWithValues = statsData?.filter(p => p.service_rating && p.service_rating > 0) || []
  const avgRating = ratingsWithValues.length > 0
    ? ratingsWithValues.reduce((sum, p) => sum + (p.service_rating || 0), 0) / ratingsWithValues.length
    : 0

  return {
    totalSynced: totalRes.count || 0,
    active: activeRes.count || 0,
    inactive: inactiveRes.count || 0,
    archived: archivedRes.count || 0,
    withRequests: withRequestsRes.count || 0,
    totalRequests,
    completedRequests,
    avgRating: avgRating.toFixed(2),
  }
}
