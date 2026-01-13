'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AvailablePeriod {
  periodFrom: string
  periodTo: string
  label: string
}

export async function getAvailablePeriods(): Promise<AvailablePeriod[]> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return []
  }

  const admin = createAdminClient()

  // Get distinct periods from allocation_history
  const { data, error } = await admin
    .from('allocation_history')
    .select('period_from, period_to')
    .order('period_from', { ascending: false })

  if (error || !data) {
    return []
  }

  // Group by unique period combinations
  const periodsMap = new Map<string, AvailablePeriod>()

  data.forEach(row => {
    const key = `${row.period_from}_${row.period_to}`
    if (!periodsMap.has(key)) {
      const fromDate = new Date(row.period_from)
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                         'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
      const label = `${monthNames[fromDate.getMonth()]} ${fromDate.getFullYear()}`

      periodsMap.set(key, {
        periodFrom: row.period_from,
        periodTo: row.period_to,
        label
      })
    }
  })

  return Array.from(periodsMap.values())
}

export interface AllocationHistoryFilters {
  search?: string
  periodFrom?: string
  periodTo?: string
  acceptanceRate?: 'low' | 'medium' | 'high'  // low: <40%, medium: 40-70%, high: >70%
  expirationRate?: 'low' | 'medium' | 'high'  // low: <10%, medium: 10-30%, high: >30%
  volume?: 'low' | 'medium' | 'high'          // low: <10, medium: 10-50, high: >50
}

export interface AllocationHistorySort {
  field: string
  direction: 'asc' | 'desc'
}

export interface PaginationParams {
  page: number
  limit: number
}

export async function getAllocationHistory(
  filters: AllocationHistoryFilters = {},
  sort: AllocationHistorySort = { field: 'requests_received', direction: 'desc' },
  pagination: PaginationParams = { page: 1, limit: 25 }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: [], total: 0, error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  // Build query - get all data first for calculated filters
  let query = admin
    .from('allocation_history')
    .select('*')

  // Apply basic filters
  if (filters.search) {
    query = query.ilike('provider_name', `%${filters.search}%`)
  }

  if (filters.periodFrom) {
    query = query.gte('period_from', filters.periodFrom)
  }

  if (filters.periodTo) {
    query = query.lte('period_to', filters.periodTo)
  }

  // Apply volume filter (can be done in DB)
  if (filters.volume === 'low') {
    query = query.lt('requests_received', 10)
  } else if (filters.volume === 'medium') {
    query = query.gte('requests_received', 10).lte('requests_received', 50)
  } else if (filters.volume === 'high') {
    query = query.gt('requests_received', 50)
  }

  // Apply sorting
  const sortField = sort.field || 'requests_received'
  const sortAsc = sort.direction === 'asc'
  query = query.order(sortField, { ascending: sortAsc })

  const { data: allData, error } = await query

  if (error) {
    console.error('Error fetching allocation history:', error)
    return { data: [], total: 0, error: error.message }
  }

  // Apply calculated filters (acceptance rate, expiration rate)
  let filteredData = allData || []

  if (filters.acceptanceRate) {
    filteredData = filteredData.filter(row => {
      const received = row.requests_received || 0
      if (received === 0) return filters.acceptanceRate === 'low'
      const rate = (row.requests_accepted || 0) / received * 100

      if (filters.acceptanceRate === 'low') return rate < 40
      if (filters.acceptanceRate === 'medium') return rate >= 40 && rate <= 70
      if (filters.acceptanceRate === 'high') return rate > 70
      return true
    })
  }

  if (filters.expirationRate) {
    filteredData = filteredData.filter(row => {
      const received = row.requests_received || 0
      if (received === 0) return filters.expirationRate === 'low'
      const rate = (row.requests_expired || 0) / received * 100

      if (filters.expirationRate === 'low') return rate < 10
      if (filters.expirationRate === 'medium') return rate >= 10 && rate <= 30
      if (filters.expirationRate === 'high') return rate > 30
      return true
    })
  }

  // Calculate pagination on filtered data
  const total = filteredData.length
  const offset = (pagination.page - 1) * pagination.limit
  const paginatedData = filteredData.slice(offset, offset + pagination.limit)

  return {
    data: paginatedData,
    total,
    error: null
  }
}

export async function getAllocationStats() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  // Get latest sync period
  const { data: latestSync } = await admin
    .from('allocation_sync_logs')
    .select('period_from, period_to')
    .eq('status', 'success')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()

  // Get aggregated stats for the latest period
  let periodFilter = {}
  if (latestSync) {
    periodFilter = {
      period_from: latestSync.period_from,
      period_to: latestSync.period_to
    }
  }

  const { data: stats } = await admin
    .from('allocation_history')
    .select('requests_received, requests_accepted, requests_expired, requests_rejected')
    .match(periodFilter)

  if (!stats || stats.length === 0) {
    return {
      totalProviders: 0,
      totalReceived: 0,
      totalAccepted: 0,
      totalRejected: 0,
      totalExpired: 0,
      acceptanceRate: 0,
      period: latestSync ? {
        from: latestSync.period_from,
        to: latestSync.period_to
      } : null
    }
  }

  const totals = stats.reduce((acc, row) => ({
    received: acc.received + (row.requests_received || 0),
    accepted: acc.accepted + (row.requests_accepted || 0),
    rejected: acc.rejected + (row.requests_rejected || 0),
    expired: acc.expired + (row.requests_expired || 0),
  }), { received: 0, accepted: 0, rejected: 0, expired: 0 })

  const acceptanceRate = totals.received > 0
    ? Math.round((totals.accepted / totals.received) * 100)
    : 0

  return {
    totalProviders: stats.length,
    totalReceived: totals.received,
    totalAccepted: totals.accepted,
    totalRejected: totals.rejected,
    totalExpired: totals.expired,
    acceptanceRate,
    period: latestSync ? {
      from: latestSync.period_from,
      to: latestSync.period_to
    } : null
  }
}

export async function getAllocationSyncLogs(limit: number = 20) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: [], error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('allocation_sync_logs')
    .select(`
      *,
      user:users!allocation_sync_logs_triggered_by_fkey (
        id,
        name,
        email
      )
    `)
    .order('triggered_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching allocation sync logs:', error)
    return { data: [], error: error.message }
  }

  return { data: data || [], error: null }
}

export async function getAllocationSyncStats() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  // Get last successful sync
  const { data: lastSync } = await admin
    .from('allocation_sync_logs')
    .select('*')
    .eq('status', 'success')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()

  // Get total syncs
  const { count: totalSyncs } = await admin
    .from('allocation_sync_logs')
    .select('*', { count: 'exact', head: true })

  // Get successful syncs
  const { count: successfulSyncs } = await admin
    .from('allocation_sync_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success')

  // Check for any in progress
  const { data: inProgress } = await admin
    .from('allocation_sync_logs')
    .select('id')
    .in('status', ['pending', 'in_progress'])
    .limit(1)

  return {
    lastSync,
    totalSyncs: totalSyncs || 0,
    successfulSyncs: successfulSyncs || 0,
    hasInProgress: (inProgress && inProgress.length > 0) || false,
    error: null
  }
}
