'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import type { ProviderFeedback } from '@/lib/forms/services-actions'

// Type for a single submission with provider info
export interface AggregatedSubmission {
  id: string
  provider_id: string
  provider_name: string
  provider_email: string | null
  provider_status: string
  submission_number: number | null
  has_activity_declaration: boolean | null
  has_liability_insurance: boolean | null
  has_work_accidents_insurance: boolean | null
  certifications: string[] | null
  works_with_platforms: string[] | null
  available_weekdays: string[] | null
  work_hours_start: string | null
  work_hours_end: string | null
  num_technicians: number | null
  has_transport: boolean | null
  has_computer: boolean | null
  own_equipment: string[] | null
  selected_services: string[] | null
  coverage_municipalities: string[] | null
  submitted_at: string | null
  submitted_ip: string | null
  feedback: ProviderFeedback | null
}

// Type for service details
export interface ServiceDetail {
  id: string
  service_name: string
  cluster: string
  service_group: string
  unit_description?: string | null
  typology?: string | null
}

export interface SubmissoesFilters {
  search?: string
  providerStatus?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedSubmissions {
  data: AggregatedSubmission[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Get all form submissions aggregated across all providers
 */
export async function getAllSubmissionsAggregated(
  filters: SubmissoesFilters = {}
): Promise<PaginatedSubmissions> {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 }
  }

  const adminClient = createAdminClient()

  const {
    providerStatus,
    dateFrom,
    dateTo,
    sortBy = 'submitted_at',
    sortOrder = 'desc',
  } = filters

  // Build query for submissions with provider info
  let query = adminClient
    .from('provider_forms_data')
    .select(
      `
      id,
      provider_id,
      submission_number,
      has_activity_declaration,
      has_liability_insurance,
      has_work_accidents_insurance,
      certifications,
      works_with_platforms,
      available_weekdays,
      work_hours_start,
      work_hours_end,
      num_technicians,
      has_transport,
      has_computer,
      own_equipment,
      selected_services,
      coverage_municipalities,
      submitted_at,
      submitted_ip,
      feedback,
      providers!inner (
        id,
        name,
        email,
        status
      )
    `,
      { count: 'exact' }
    )

  // Apply date filters
  if (dateFrom) {
    query = query.gte('submitted_at', `${dateFrom}T00:00:00`)
  }
  if (dateTo) {
    query = query.lte('submitted_at', `${dateTo}T23:59:59`)
  }

  // Apply provider status filter
  if (providerStatus && providerStatus !== 'all') {
    query = query.eq('providers.status', providerStatus)
  }

  // Apply sorting
  const validSortColumns = [
    'submitted_at',
    'submission_number',
    'num_technicians',
  ]
  if (validSortColumns.includes(sortBy)) {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })
  } else {
    query = query.order('submitted_at', { ascending: false })
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching submissions:', error)
    return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 }
  }

  // Transform data to include provider info at top level
  const transformedData: AggregatedSubmission[] = (data || []).map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = (item as any).providers as {
      id: string
      name: string
      email: string | null
      status: string
    }

    return {
      id: item.id,
      provider_id: item.provider_id,
      provider_name: provider?.name || 'Desconhecido',
      provider_email: provider?.email || null,
      provider_status: provider?.status || 'desconhecido',
      submission_number: item.submission_number,
      has_activity_declaration: item.has_activity_declaration,
      has_liability_insurance: item.has_liability_insurance,
      has_work_accidents_insurance: item.has_work_accidents_insurance,
      certifications: item.certifications,
      works_with_platforms: item.works_with_platforms,
      available_weekdays: item.available_weekdays,
      work_hours_start: item.work_hours_start,
      work_hours_end: item.work_hours_end,
      num_technicians: item.num_technicians,
      has_transport: item.has_transport,
      has_computer: item.has_computer,
      own_equipment: item.own_equipment,
      selected_services: item.selected_services,
      coverage_municipalities: item.coverage_municipalities,
      submitted_at: item.submitted_at,
      submitted_ip: item.submitted_ip,
      feedback: item.feedback as ProviderFeedback | null,
    }
  })

  const total = count || 0

  return {
    data: transformedData,
    total,
    page: 1,
    limit: total,
    totalPages: 1,
  }
}

/**
 * Get service details for a list of service IDs
 */
export async function getServiceDetailsForSubmissions(
  serviceIds: string[]
): Promise<Record<string, ServiceDetail>> {
  if (serviceIds.length === 0) {
    return {}
  }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('service_prices')
    .select('id, service_name, cluster, service_group, unit_description, typology')
    .in('id', serviceIds)
    .order('cluster')
    .order('service_group')
    .order('service_name')

  if (error) {
    console.error('Error fetching service details:', error)
    return {}
  }

  const servicesMap: Record<string, ServiceDetail> = {}
  data?.forEach((service) => {
    servicesMap[service.id] = service
  })

  return servicesMap
}

/**
 * Get submission stats
 */
export async function getSubmissionsStats(): Promise<{
  total: number
  thisWeek: number
  thisMonth: number
  byStatus: Record<string, number>
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { total: 0, thisWeek: 0, thisMonth: 0, byStatus: {} }
  }

  const adminClient = createAdminClient()

  // Get total count
  const { count: total } = await adminClient
    .from('provider_forms_data')
    .select('*', { count: 'exact', head: true })

  // Get this week's count
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const { count: thisWeek } = await adminClient
    .from('provider_forms_data')
    .select('*', { count: 'exact', head: true })
    .gte('submitted_at', oneWeekAgo.toISOString())

  // Get this month's count
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  const { count: thisMonth } = await adminClient
    .from('provider_forms_data')
    .select('*', { count: 'exact', head: true })
    .gte('submitted_at', oneMonthAgo.toISOString())

  // Get count by provider status
  const { data: statusData } = await adminClient
    .from('provider_forms_data')
    .select(
      `
      provider_id,
      providers!inner (status)
    `
    )

  const byStatus: Record<string, number> = {}
  statusData?.forEach((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = ((item as any).providers as { status: string })?.status || 'desconhecido'
    byStatus[status] = (byStatus[status] || 0) + 1
  })

  return {
    total: total || 0,
    thisWeek: thisWeek || 0,
    thisMonth: thisMonth || 0,
    byStatus,
  }
}
