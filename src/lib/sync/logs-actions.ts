'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface SyncLog {
  id: string
  triggered_by: string
  triggered_at: string
  date_from: string
  date_to: string
  status: 'success' | 'error' | 'in_progress'
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
  user: {
    name: string
    email: string
  }
}

export interface ProviderSyncLog {
  id: string
  triggered_by: string
  triggered_at: string
  status: 'success' | 'error' | 'in_progress'
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
  user: {
    name: string
    email: string
  }
}

/**
 * Get all sync logs with user details
 */
export async function getSyncLogs(): Promise<SyncLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('sync_logs')
    .select(`
      *,
      user:users!sync_logs_triggered_by_fkey (
        name,
        email
      )
    `)
    .order('triggered_at', { ascending: false })
    .limit(100) // Last 100 syncs

  if (error) {
    console.error('Error fetching sync logs:', error)
    return []
  }

  return data as unknown as SyncLog[]
}

export interface SyncStats {
  total: number
  success: number
  error: number
  in_progress: number
  lastSync: {
    triggered_at: string
    status: string
    records_processed: number
  } | null
  avgDuration: number
  totalRecordsProcessed: number
}

/**
 * Get sync stats summary
 */
export async function getSyncStats(): Promise<SyncStats> {
  const supabase = createAdminClient()

  // Get counts by status
  const { data: statusCounts } = await supabase
    .from('sync_logs')
    .select('status')

  const stats = {
    total: statusCounts?.length || 0,
    success: statusCounts?.filter(l => l.status === 'success').length || 0,
    error: statusCounts?.filter(l => l.status === 'error').length || 0,
    in_progress: statusCounts?.filter(l => l.status === 'in_progress').length || 0,
  }

  // Get last sync
  const { data: lastSyncData } = await supabase
    .from('sync_logs')
    .select('triggered_at, status, records_processed')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()

  const lastSync = lastSyncData as { triggered_at: string; status: string; records_processed: number } | null

  // Calculate average duration (successful syncs only)
  const { data: successfulSyncs } = await supabase
    .from('sync_logs')
    .select('duration_seconds')
    .eq('status', 'success')
    .not('duration_seconds', 'is', null)

  const avgDuration = successfulSyncs && successfulSyncs.length > 0
    ? Math.round(
        successfulSyncs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) /
        successfulSyncs.length
      )
    : 0

  // Calculate total records processed
  const { data: totalRecords } = await supabase
    .from('sync_logs')
    .select('records_processed')

  const totalProcessed = totalRecords?.reduce((sum, log) => sum + (log.records_processed || 0), 0) || 0

  return {
    ...stats,
    lastSync: lastSync || null,
    avgDuration,
    totalRecordsProcessed: totalProcessed,
  }
}

/**
 * Get all provider sync logs with user details
 */
export async function getProviderSyncLogs(): Promise<ProviderSyncLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('provider_sync_logs')
    .select(`
      *,
      user:users!provider_sync_logs_triggered_by_fkey (
        name,
        email
      )
    `)
    .order('triggered_at', { ascending: false })
    .limit(100) // Last 100 syncs

  if (error) {
    console.error('Error fetching provider sync logs:', error)
    return []
  }

  return data as unknown as ProviderSyncLog[]
}

export interface ProviderSyncStats {
  total: number
  success: number
  error: number
  in_progress: number
  lastSync: {
    triggered_at: string
    status: string
    records_processed: number
  } | null
  avgDuration: number
  totalRecordsProcessed: number
}

/**
 * Get provider sync stats summary
 */
export async function getProviderSyncStats(): Promise<ProviderSyncStats> {
  const supabase = createAdminClient()

  // Get counts by status
  const { data: statusCounts } = await supabase
    .from('provider_sync_logs')
    .select('status')

  const stats = {
    total: statusCounts?.length || 0,
    success: statusCounts?.filter(l => l.status === 'success').length || 0,
    error: statusCounts?.filter(l => l.status === 'error').length || 0,
    in_progress: statusCounts?.filter(l => l.status === 'in_progress').length || 0,
  }

  // Get last sync
  const { data: lastSyncData } = await supabase
    .from('provider_sync_logs')
    .select('triggered_at, status, records_processed')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()

  const lastSync = lastSyncData as { triggered_at: string; status: string; records_processed: number } | null

  // Calculate average duration (successful syncs only)
  const { data: successfulSyncs } = await supabase
    .from('provider_sync_logs')
    .select('duration_seconds')
    .eq('status', 'success')
    .not('duration_seconds', 'is', null)

  const avgDuration = successfulSyncs && successfulSyncs.length > 0
    ? Math.round(
        successfulSyncs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) /
        successfulSyncs.length
      )
    : 0

  // Calculate total records processed
  const { data: totalRecords } = await supabase
    .from('provider_sync_logs')
    .select('records_processed')

  const totalProcessed = totalRecords?.reduce((sum, log) => sum + (log.records_processed || 0), 0) || 0

  return {
    ...stats,
    lastSync: lastSync || null,
    avgDuration,
    totalRecordsProcessed: totalProcessed,
  }
}
