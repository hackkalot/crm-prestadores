'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface AvailableBillingPeriod {
  periodFrom: string
  periodTo: string
  label: string
}

export async function getAvailableBillingPeriods(): Promise<AvailableBillingPeriod[]> {
  const supabase = createAdminClient()

  // Get distinct months from document_date
  const { data, error } = await supabase
    .from('billing_processes')
    .select('document_date')
    .not('document_date', 'is', null)
    .order('document_date', { ascending: false })

  if (error || !data) {
    return []
  }

  // Group by unique month/year combinations
  const periodsMap = new Map<string, AvailableBillingPeriod>()

  data.forEach(row => {
    if (!row.document_date) return

    const date = new Date(row.document_date)
    const year = date.getFullYear()
    const month = date.getMonth()

    // Create key as YYYY-MM
    const key = `${year}-${String(month + 1).padStart(2, '0')}`

    if (!periodsMap.has(key)) {
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                         'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

      periodsMap.set(key, {
        periodFrom: firstDay.toISOString().split('T')[0],
        periodTo: lastDay.toISOString().split('T')[0],
        label: `${monthNames[month]} ${year}`
      })
    }
  })

  return Array.from(periodsMap.values())
}

export interface BillingProcess {
  id: string
  request_code: string
  service_request_identifier: number | null
  assigned_provider_name: string | null
  service: string | null
  scheduled_to: string | null
  document_date: string | null
  bo_validation_date: string | null
  payment_date: string | null
  timestamp_process_status: string | null
  invoices_number: number
  credit_note_number: number
  has_duplicate: boolean
  provider_automatic_cost: boolean
  complaint: boolean
  total_service_cost: number
  base_service_cost: number
  total_invoice_value: number
  sum_transactions: number
  process_status: string | null
  document_number: string | null
  conclusion_response: string | null
  synced_at: string | null
  created_at: string
  updated_at: string
}

export interface BillingFilters {
  status?: string
  provider?: string
  service?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface BillingStats {
  total: number
  porEnviar: number
  emAnalise: number
  naoAceite: number
  aceite: number
  pago: number
  arquivado: number
  totalValue: number
  paidValue: number
}

export interface PaginatedBillingProcesses {
  data: BillingProcess[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Get billing processes with filters and pagination
export async function getBillingProcesses(
  filters: BillingFilters = {}
): Promise<PaginatedBillingProcesses> {
  const supabase = createAdminClient()
  const page = filters.page || 1
  const limit = filters.limit || 100
  const from = (page - 1) * limit
  const to = from + limit - 1
  const sortBy = filters.sortBy || 'document_date'
  const sortOrder = filters.sortOrder || 'desc'

  // First get total count with filters
  let countQuery = supabase
    .from('billing_processes')
    .select('*', { count: 'exact', head: true })

  // Apply same filters to count
  if (filters.status && filters.status !== 'all') {
    countQuery = countQuery.eq('process_status', filters.status)
  }

  if (filters.provider && filters.provider !== 'all') {
    countQuery = countQuery.eq('assigned_provider_name', filters.provider)
  }

  if (filters.service && filters.service !== 'all') {
    countQuery = countQuery.eq('service', filters.service)
  }

  if (filters.search) {
    countQuery = countQuery.or(
      `request_code.ilike.%${filters.search}%,assigned_provider_name.ilike.%${filters.search}%,document_number.ilike.%${filters.search}%`
    )
  }

  if (filters.dateFrom) {
    countQuery = countQuery.gte('document_date', filters.dateFrom)
  }

  if (filters.dateTo) {
    countQuery = countQuery.lte('document_date', filters.dateTo)
  }

  const { count } = await countQuery

  // Now get paginated data
  let query = supabase
    .from('billing_processes')
    .select('*')
    .order(sortBy, { ascending: sortOrder === 'asc', nullsFirst: false })
    .range(from, to)

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    query = query.eq('process_status', filters.status)
  }

  if (filters.provider && filters.provider !== 'all') {
    query = query.eq('assigned_provider_name', filters.provider)
  }

  if (filters.service && filters.service !== 'all') {
    query = query.eq('service', filters.service)
  }

  if (filters.search) {
    query = query.or(
      `request_code.ilike.%${filters.search}%,assigned_provider_name.ilike.%${filters.search}%,document_number.ilike.%${filters.search}%`
    )
  }

  if (filters.dateFrom) {
    query = query.gte('document_date', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('document_date', filters.dateTo)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching billing processes:', error)
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    }
  }

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  return {
    data: data as BillingProcess[],
    total,
    page,
    limit,
    totalPages,
  }
}

// Get billing stats
export async function getBillingStats(): Promise<BillingStats> {
  const supabase = createAdminClient()

  // Get counts by status
  const { data: statusCounts, error: countError } = await supabase
    .from('billing_processes')
    .select('process_status')

  if (countError) {
    console.error('Error fetching billing stats:', countError)
    return {
      total: 0,
      porEnviar: 0,
      emAnalise: 0,
      naoAceite: 0,
      aceite: 0,
      pago: 0,
      arquivado: 0,
      totalValue: 0,
      paidValue: 0,
    }
  }

  // Count by status
  const counts = {
    total: statusCounts?.length || 0,
    porEnviar: 0,
    emAnalise: 0,
    naoAceite: 0,
    aceite: 0,
    pago: 0,
    arquivado: 0,
  }

  statusCounts?.forEach((row) => {
    const status = row.process_status?.toLowerCase() || ''
    if (status === 'por enviar') counts.porEnviar++
    else if (status === 'em análise' || status === 'em analise')
      counts.emAnalise++
    else if (status === 'não aceite' || status === 'nao aceite')
      counts.naoAceite++
    else if (status === 'aceite') counts.aceite++
    else if (status === 'pago') counts.pago++
    else if (status === 'arquivado') counts.arquivado++
  })

  // Get totals for values
  const { data: valueSums } = await supabase
    .from('billing_processes')
    .select('total_invoice_value, process_status')

  let totalValue = 0
  let paidValue = 0

  valueSums?.forEach((row) => {
    const value = row.total_invoice_value || 0
    totalValue += value
    if (row.process_status?.toLowerCase() === 'pago') {
      paidValue += value
    }
  })

  return {
    ...counts,
    totalValue,
    paidValue,
  }
}

// Get distinct providers for filters
export async function getDistinctBillingProviders(): Promise<string[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('billing_processes')
    .select('assigned_provider_name')
    .not('assigned_provider_name', 'is', null)
    .order('assigned_provider_name')

  if (error) {
    console.error('Error fetching distinct providers:', error)
    return []
  }

  const unique = [...new Set(data?.map((d) => d.assigned_provider_name))]
  return unique.filter(Boolean) as string[]
}

// Get distinct services for filters
export async function getDistinctBillingServices(): Promise<string[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('billing_processes')
    .select('service')
    .not('service', 'is', null)
    .order('service')

  if (error) {
    console.error('Error fetching distinct services:', error)
    return []
  }

  const unique = [...new Set(data?.map((d) => d.service))]
  return unique.filter(Boolean) as string[]
}

// Get distinct statuses for filters
export async function getDistinctBillingStatuses(): Promise<string[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('billing_processes')
    .select('process_status')
    .not('process_status', 'is', null)
    .order('process_status')

  if (error) {
    console.error('Error fetching distinct statuses:', error)
    return []
  }

  const unique = [...new Set(data?.map((d) => d.process_status))]
  return unique.filter(Boolean) as string[]
}
