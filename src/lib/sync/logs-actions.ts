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
  triggered_by: string | null
  triggered_by_system: string | null
  triggered_at: string
  status: 'success' | 'error' | 'in_progress' | 'pending'
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
  } | null
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

// Billing Sync Logs

export interface BillingSyncLog {
  id: string
  triggered_by: string | null
  triggered_by_system: string | null
  triggered_at: string
  status: 'success' | 'error' | 'in_progress' | 'pending'
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
  } | null
}

/**
 * Get all billing sync logs with user details
 */
export async function getBillingSyncLogs(): Promise<BillingSyncLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('billing_sync_logs')
    .select(`
      *,
      user:users!billing_sync_logs_triggered_by_fkey (
        name,
        email
      )
    `)
    .order('triggered_at', { ascending: false })
    .limit(100) // Last 100 syncs

  if (error) {
    console.error('Error fetching billing sync logs:', error)
    return []
  }

  return data as unknown as BillingSyncLog[]
}

export interface BillingSyncStats {
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
 * Get billing sync stats summary
 */
export async function getBillingSyncStats(): Promise<BillingSyncStats> {
  const supabase = createAdminClient()

  // Get counts by status
  const { data: statusCounts } = await supabase
    .from('billing_sync_logs')
    .select('status')

  const stats = {
    total: statusCounts?.length || 0,
    success: statusCounts?.filter(l => l.status === 'success').length || 0,
    error: statusCounts?.filter(l => l.status === 'error').length || 0,
    in_progress: statusCounts?.filter(l => l.status === 'in_progress').length || 0,
  }

  // Get last sync
  const { data: lastSyncData } = await supabase
    .from('billing_sync_logs')
    .select('triggered_at, status, records_processed')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()

  const lastSync = lastSyncData as { triggered_at: string; status: string; records_processed: number } | null

  // Calculate average duration (successful syncs only)
  const { data: successfulSyncs } = await supabase
    .from('billing_sync_logs')
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
    .from('billing_sync_logs')
    .select('records_processed')

  const totalProcessed = totalRecords?.reduce((sum, log) => sum + (log.records_processed || 0), 0) || 0

  return {
    ...stats,
    lastSync: lastSync || null,
    avgDuration,
    totalRecordsProcessed: totalProcessed,
  }
}

// Allocation History Sync Logs

export interface AllocationSyncLog {
  id: string
  triggered_by: string | null
  triggered_by_system: string | null
  triggered_at: string
  period_from: string | null
  period_to: string | null
  status: 'success' | 'error' | 'in_progress' | 'pending'
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
  } | null
}

/**
 * Get all allocation sync logs with user details
 */
export async function getAllocationSyncLogs(): Promise<AllocationSyncLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('allocation_sync_logs')
    .select(`
      *,
      user:users!allocation_sync_logs_triggered_by_fkey (
        name,
        email
      )
    `)
    .order('triggered_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching allocation sync logs:', error)
    return []
  }

  return data as unknown as AllocationSyncLog[]
}

export interface AllocationSyncStats {
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
 * Get allocation sync stats summary
 */
export async function getAllocationSyncStats(): Promise<AllocationSyncStats> {
  const supabase = createAdminClient()

  const { data: statusCounts } = await supabase
    .from('allocation_sync_logs')
    .select('status')

  const stats = {
    total: statusCounts?.length || 0,
    success: statusCounts?.filter(l => l.status === 'success').length || 0,
    error: statusCounts?.filter(l => l.status === 'error').length || 0,
    in_progress: statusCounts?.filter(l => l.status === 'in_progress').length || 0,
  }

  const { data: lastSyncData } = await supabase
    .from('allocation_sync_logs')
    .select('triggered_at, status, records_processed')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()

  const lastSync = lastSyncData as { triggered_at: string; status: string; records_processed: number } | null

  const { data: successfulSyncs } = await supabase
    .from('allocation_sync_logs')
    .select('duration_seconds')
    .eq('status', 'success')
    .not('duration_seconds', 'is', null)

  const avgDuration = successfulSyncs && successfulSyncs.length > 0
    ? Math.round(
        successfulSyncs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) /
        successfulSyncs.length
      )
    : 0

  const { data: totalRecordsAlloc } = await supabase
    .from('allocation_sync_logs')
    .select('records_processed')

  const totalProcessedAlloc = totalRecordsAlloc?.reduce((sum, log) => sum + (log.records_processed || 0), 0) || 0

  return {
    ...stats,
    lastSync: lastSync || null,
    avgDuration,
    totalRecordsProcessed: totalProcessedAlloc,
  }
}

// Clients Sync Logs

export interface ClientsSyncLog {
  id: string
  triggered_by: string | null
  triggered_by_system: string | null
  triggered_at: string
  status: 'success' | 'error' | 'in_progress' | 'pending'
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
  } | null
}

/**
 * Get all clients sync logs with user details
 */
export async function getClientsSyncLogs(): Promise<ClientsSyncLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('clients_sync_logs')
    .select(`
      *,
      user:users!clients_sync_logs_triggered_by_fkey (
        name,
        email
      )
    `)
    .order('triggered_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching clients sync logs:', error)
    return []
  }

  return data as unknown as ClientsSyncLog[]
}

export interface ClientsSyncStats {
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
 * Get clients sync stats summary
 */
export async function getClientsSyncStats(): Promise<ClientsSyncStats> {
  const supabase = createAdminClient()

  const { data: statusCounts } = await supabase
    .from('clients_sync_logs')
    .select('status')

  const stats = {
    total: statusCounts?.length || 0,
    success: statusCounts?.filter(l => l.status === 'success').length || 0,
    error: statusCounts?.filter(l => l.status === 'error').length || 0,
    in_progress: statusCounts?.filter(l => l.status === 'in_progress').length || 0,
  }

  const { data: lastSyncData } = await supabase
    .from('clients_sync_logs')
    .select('triggered_at, status, records_processed')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()

  const lastSync = lastSyncData as { triggered_at: string; status: string; records_processed: number } | null

  const { data: successfulSyncs } = await supabase
    .from('clients_sync_logs')
    .select('duration_seconds')
    .eq('status', 'success')
    .not('duration_seconds', 'is', null)

  const avgDuration = successfulSyncs && successfulSyncs.length > 0
    ? Math.round(
        successfulSyncs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) /
        successfulSyncs.length
      )
    : 0

  const { data: totalRecordsClients } = await supabase
    .from('clients_sync_logs')
    .select('records_processed')

  const totalProcessedClients = totalRecordsClients?.reduce((sum, log) => sum + (log.records_processed || 0), 0) || 0

  return {
    ...stats,
    lastSync: lastSync || null,
    avgDuration,
    totalRecordsProcessed: totalProcessedClients,
  }
}

// Recurrences Sync Logs

export interface RecurrencesSyncLog {
  id: string
  triggered_by: string | null
  triggered_by_system: string | null
  triggered_at: string
  status: 'success' | 'error' | 'in_progress' | 'pending'
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
  } | null
}

/**
 * Get all recurrences sync logs with user details
 */
export async function getRecurrencesSyncLogs(): Promise<RecurrencesSyncLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('recurrences_sync_logs')
    .select(`
      *,
      user:users!recurrences_sync_logs_triggered_by_fkey (
        name,
        email
      )
    `)
    .order('triggered_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching recurrences sync logs:', error)
    return []
  }

  return data as unknown as RecurrencesSyncLog[]
}

export interface RecurrencesSyncStats {
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
 * Get recurrences sync stats summary
 */
export async function getRecurrencesSyncStats(): Promise<RecurrencesSyncStats> {
  const supabase = createAdminClient()

  const { data: statusCounts } = await supabase
    .from('recurrences_sync_logs')
    .select('status')

  const stats = {
    total: statusCounts?.length || 0,
    success: statusCounts?.filter(l => l.status === 'success').length || 0,
    error: statusCounts?.filter(l => l.status === 'error').length || 0,
    in_progress: statusCounts?.filter(l => l.status === 'in_progress').length || 0,
  }

  const { data: lastSyncData } = await supabase
    .from('recurrences_sync_logs')
    .select('triggered_at, status, records_processed')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()

  const lastSync = lastSyncData as { triggered_at: string; status: string; records_processed: number } | null

  const { data: successfulSyncs } = await supabase
    .from('recurrences_sync_logs')
    .select('duration_seconds')
    .eq('status', 'success')
    .not('duration_seconds', 'is', null)

  const avgDuration = successfulSyncs && successfulSyncs.length > 0
    ? Math.round(
        successfulSyncs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) /
        successfulSyncs.length
      )
    : 0

  const { data: totalRecordsRecurrences } = await supabase
    .from('recurrences_sync_logs')
    .select('records_processed')

  const totalProcessedRecurrences = totalRecordsRecurrences?.reduce((sum, log) => sum + (log.records_processed || 0), 0) || 0

  return {
    ...stats,
    lastSync: lastSync || null,
    avgDuration,
    totalRecordsProcessed: totalProcessedRecurrences,
  }
}

// Tasks Sync Logs

export interface TasksSyncLog {
  id: string
  triggered_by: string | null
  triggered_by_system: string | null
  triggered_at: string
  status: 'success' | 'error' | 'in_progress' | 'pending'
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
  } | null
}

/**
 * Get all tasks sync logs with user details
 */
export async function getTasksSyncLogs(): Promise<TasksSyncLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('tasks_sync_logs')
    .select(`
      *,
      user:users!tasks_sync_logs_triggered_by_fkey (
        name,
        email
      )
    `)
    .order('triggered_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching tasks sync logs:', error)
    return []
  }

  return data as unknown as TasksSyncLog[]
}

export interface TasksSyncStats {
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
 * Get tasks sync stats summary
 */
export async function getTasksSyncStats(): Promise<TasksSyncStats> {
  const supabase = createAdminClient()

  const { data: statusCounts } = await supabase
    .from('tasks_sync_logs')
    .select('status')

  const stats = {
    total: statusCounts?.length || 0,
    success: statusCounts?.filter(l => l.status === 'success').length || 0,
    error: statusCounts?.filter(l => l.status === 'error').length || 0,
    in_progress: statusCounts?.filter(l => l.status === 'in_progress').length || 0,
  }

  const { data: lastSyncData } = await supabase
    .from('tasks_sync_logs')
    .select('triggered_at, status, records_processed')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()

  const lastSync = lastSyncData as { triggered_at: string; status: string; records_processed: number } | null

  const { data: successfulSyncs } = await supabase
    .from('tasks_sync_logs')
    .select('duration_seconds')
    .eq('status', 'success')
    .not('duration_seconds', 'is', null)

  const avgDuration = successfulSyncs && successfulSyncs.length > 0
    ? Math.round(
        successfulSyncs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) /
        successfulSyncs.length
      )
    : 0

  const { data: totalRecordsTasks } = await supabase
    .from('tasks_sync_logs')
    .select('records_processed')

  const totalProcessedTasks = totalRecordsTasks?.reduce((sum, log) => sum + (log.records_processed || 0), 0) || 0

  return {
    ...stats,
    lastSync: lastSync || null,
    avgDuration,
    totalRecordsProcessed: totalProcessedTasks,
  }
}

// Types for sync info
export type SyncType = 'service_requests' | 'billing' | 'providers' | 'allocations' | 'clients' | 'recurrences' | 'tasks'

export interface LastSyncInfo {
  type: SyncType
  lastSuccessfulSync: string | null
  status: 'success' | 'error' | 'in_progress' | 'pending' | null
}

/**
 * Get the last successful sync date for a specific type
 */
export async function getLastSuccessfulSync(type: SyncType): Promise<LastSyncInfo> {
  const supabase = createAdminClient()

  const tableMap: Record<SyncType, string> = {
    service_requests: 'sync_logs',
    billing: 'billing_sync_logs',
    providers: 'provider_sync_logs',
    allocations: 'allocation_sync_logs',
    clients: 'clients_sync_logs',
    recurrences: 'recurrences_sync_logs',
    tasks: 'tasks_sync_logs',
  }

  const table = tableMap[type]

  // Get the last successful sync
  const { data: lastSuccess } = await supabase
    .from(table)
    .select('updated_at, status')
    .eq('status', 'success')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  // Get the current/latest sync status (might be in_progress)
  const { data: latestSync } = await supabase
    .from(table)
    .select('status')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()

  return {
    type,
    lastSuccessfulSync: lastSuccess?.updated_at || null,
    status: latestSync?.status as LastSyncInfo['status'] || null,
  }
}

/**
 * Get last sync info for multiple types at once
 */
export async function getLastSyncInfoBatch(types: SyncType[]): Promise<Record<SyncType, LastSyncInfo>> {
  const results = await Promise.all(types.map(type => getLastSuccessfulSync(type)))

  return results.reduce((acc, info) => {
    acc[info.type] = info
    return acc
  }, {} as Record<SyncType, LastSyncInfo>)
}
