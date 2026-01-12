'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface ProviderPerformanceFilters {
  dateFrom?: string
  dateTo?: string
}

export interface ProviderPerformance {
  // Volume & Tendencia
  totalRequests: number
  requestsByMonth: { month: string; count: number }[]
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number

  // Taxa de Conclusao
  completionRate: number
  statusBreakdown: { status: string; count: number; percentage: number }[]
  avgExecutionDays: number | null

  // Financeiro
  totalRevenue: number
  avgTicket: number
  revenueByCategory: { category: string; revenue: number }[]

  // Qualidade
  avgRating: number | null
  ratingDistribution: { rating: number; count: number }[]
  totalRatings: number
}

export interface NetworkBenchmark {
  avgCompletionRate: number
  avgExecutionDays: number
  avgTicket: number
  avgRating: number
  medianRequestsPerProvider: number
}

// Get performance metrics for a specific provider
export async function getProviderPerformance(
  backofficeProviderId: number,
  filters?: ProviderPerformanceFilters
): Promise<ProviderPerformance> {
  const supabase = createAdminClient()
  const providerIdString = String(backofficeProviderId)

  // Build base query
  let query = supabase
    .from('service_requests')
    .select('*')
    .eq('assigned_provider_id', providerIdString)

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const { data: requests, error } = await query

  if (error || !requests) {
    console.error('Error fetching provider performance:', error)
    return getEmptyPerformance()
  }

  // Calculate metrics
  const totalRequests = requests.length

  // Requests by month (last 12 months)
  const requestsByMonth = calculateRequestsByMonth(requests)

  // Trend calculation
  const { trend, trendPercentage } = calculateTrend(requestsByMonth)

  // Status breakdown
  const statusBreakdown = calculateStatusBreakdown(requests)

  // Completion rate
  const completedRequests = requests.filter((r) => r.status === 'Concluído').length
  const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0

  // Average execution days (for completed requests)
  const avgExecutionDays = calculateAvgExecutionDays(requests)

  // Financial metrics
  const { totalRevenue, avgTicket, revenueByCategory } = calculateFinancialMetrics(requests)

  // Quality metrics
  const { avgRating, ratingDistribution, totalRatings } = calculateQualityMetrics(requests)

  return {
    totalRequests,
    requestsByMonth,
    trend,
    trendPercentage,
    completionRate: Math.round(completionRate * 10) / 10,
    statusBreakdown,
    avgExecutionDays,
    totalRevenue,
    avgTicket,
    revenueByCategory,
    avgRating,
    ratingDistribution,
    totalRatings,
  }
}

// Get network-wide benchmark metrics
export async function getNetworkBenchmark(
  filters?: ProviderPerformanceFilters
): Promise<NetworkBenchmark> {
  const supabase = createAdminClient()

  // Build base query
  let query = supabase.from('service_requests').select('*')

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const { data: requests, error } = await query

  if (error || !requests || requests.length === 0) {
    return {
      avgCompletionRate: 0,
      avgExecutionDays: 0,
      avgTicket: 0,
      avgRating: 0,
      medianRequestsPerProvider: 0,
    }
  }

  // Group requests by provider
  const requestsByProvider = new Map<string, typeof requests>()
  for (const request of requests) {
    const providerId = request.assigned_provider_id
    if (providerId) {
      const existing = requestsByProvider.get(providerId) || []
      existing.push(request)
      requestsByProvider.set(providerId, existing)
    }
  }

  // Calculate averages per provider
  const providerMetrics: {
    completionRate: number
    executionDays: number[]
    avgTicket: number
    avgRating: number
    requestCount: number
  }[] = []

  for (const [, providerRequests] of requestsByProvider) {
    const completed = providerRequests.filter((r) => r.status === 'Concluído').length
    const completionRate =
      providerRequests.length > 0 ? (completed / providerRequests.length) * 100 : 0

    const executionDays: number[] = []
    for (const req of providerRequests.filter((r) => r.status === 'Concluído')) {
      if (req.created_at && req.status_updated_at) {
        const days = Math.ceil(
          (new Date(req.status_updated_at).getTime() - new Date(req.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
        )
        if (days >= 0) executionDays.push(days)
      }
    }

    const revenues = providerRequests
      .filter((r) => r.net_amount && r.net_amount > 0)
      .map((r) => r.net_amount!)
    const avgTicket = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0

    const ratings = providerRequests
      .filter((r) => r.service_rating && r.service_rating > 0)
      .map((r) => r.service_rating!)
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

    providerMetrics.push({
      completionRate,
      executionDays,
      avgTicket,
      avgRating,
      requestCount: providerRequests.length,
    })
  }

  // Calculate network averages
  const avgCompletionRate =
    providerMetrics.length > 0
      ? providerMetrics.reduce((sum, p) => sum + p.completionRate, 0) / providerMetrics.length
      : 0

  const allExecutionDays = providerMetrics.flatMap((p) => p.executionDays)
  const avgExecutionDays =
    allExecutionDays.length > 0
      ? allExecutionDays.reduce((a, b) => a + b, 0) / allExecutionDays.length
      : 0

  const avgTickets = providerMetrics.filter((p) => p.avgTicket > 0).map((p) => p.avgTicket)
  const avgTicket =
    avgTickets.length > 0 ? avgTickets.reduce((a, b) => a + b, 0) / avgTickets.length : 0

  const avgRatings = providerMetrics.filter((p) => p.avgRating > 0).map((p) => p.avgRating)
  const avgRating =
    avgRatings.length > 0 ? avgRatings.reduce((a, b) => a + b, 0) / avgRatings.length : 0

  // Median requests per provider
  const requestCounts = providerMetrics.map((p) => p.requestCount).sort((a, b) => a - b)
  const medianRequestsPerProvider =
    requestCounts.length > 0
      ? requestCounts.length % 2 === 0
        ? (requestCounts[requestCounts.length / 2 - 1] + requestCounts[requestCounts.length / 2]) /
          2
        : requestCounts[Math.floor(requestCounts.length / 2)]
      : 0

  return {
    avgCompletionRate: Math.round(avgCompletionRate * 10) / 10,
    avgExecutionDays: Math.round(avgExecutionDays * 10) / 10,
    avgTicket: Math.round(avgTicket * 100) / 100,
    avgRating: Math.round(avgRating * 10) / 10,
    medianRequestsPerProvider: Math.round(medianRequestsPerProvider),
  }
}

// Helper functions
function getEmptyPerformance(): ProviderPerformance {
  return {
    totalRequests: 0,
    requestsByMonth: [],
    trend: 'stable',
    trendPercentage: 0,
    completionRate: 0,
    statusBreakdown: [],
    avgExecutionDays: null,
    totalRevenue: 0,
    avgTicket: 0,
    revenueByCategory: [],
    avgRating: null,
    ratingDistribution: [],
    totalRatings: 0,
  }
}

function calculateRequestsByMonth(
  requests: { created_at: string }[]
): { month: string; count: number }[] {
  const monthCounts = new Map<string, number>()

  // Initialize last 12 months
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthCounts.set(key, 0)
  }

  // Count requests per month
  for (const request of requests) {
    const date = new Date(request.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (monthCounts.has(key)) {
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1)
    }
  }

  return Array.from(monthCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month,
      count,
    }))
}

function calculateTrend(requestsByMonth: { month: string; count: number }[]): {
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
} {
  if (requestsByMonth.length < 2) {
    return { trend: 'stable', trendPercentage: 0 }
  }

  const currentMonth = requestsByMonth[requestsByMonth.length - 1].count
  const previousMonth = requestsByMonth[requestsByMonth.length - 2].count

  if (previousMonth === 0) {
    return {
      trend: currentMonth > 0 ? 'up' : 'stable',
      trendPercentage: currentMonth > 0 ? 100 : 0,
    }
  }

  const percentageChange = ((currentMonth - previousMonth) / previousMonth) * 100

  return {
    trend: percentageChange > 5 ? 'up' : percentageChange < -5 ? 'down' : 'stable',
    trendPercentage: Math.round(Math.abs(percentageChange)),
  }
}

function calculateStatusBreakdown(
  requests: { status: string }[]
): { status: string; count: number; percentage: number }[] {
  const statusCounts = new Map<string, number>()

  for (const request of requests) {
    const status = request.status || 'Desconhecido'
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
  }

  const total = requests.length
  return Array.from(statusCounts.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

function calculateAvgExecutionDays(
  requests: { status: string; created_at: string; status_updated_at: string | null }[]
): number | null {
  const completedRequests = requests.filter(
    (r) => r.status === 'Concluído' && r.status_updated_at
  )

  if (completedRequests.length === 0) return null

  const totalDays = completedRequests.reduce((sum, request) => {
    const created = new Date(request.created_at)
    const completed = new Date(request.status_updated_at!)
    const days = Math.ceil(
      (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    )
    return sum + Math.max(0, days)
  }, 0)

  return Math.round((totalDays / completedRequests.length) * 10) / 10
}

function calculateFinancialMetrics(
  requests: { net_amount: number | null; category: string | null }[]
): {
  totalRevenue: number
  avgTicket: number
  revenueByCategory: { category: string; revenue: number }[]
} {
  const requestsWithRevenue = requests.filter((r) => r.net_amount && r.net_amount > 0)

  const totalRevenue = requestsWithRevenue.reduce((sum, r) => sum + (r.net_amount || 0), 0)
  const avgTicket =
    requestsWithRevenue.length > 0 ? totalRevenue / requestsWithRevenue.length : 0

  // Revenue by category
  const categoryRevenue = new Map<string, number>()
  for (const request of requestsWithRevenue) {
    const category = request.category || 'Outros'
    categoryRevenue.set(category, (categoryRevenue.get(category) || 0) + (request.net_amount || 0))
  }

  const revenueByCategory = Array.from(categoryRevenue.entries())
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5) // Top 5 categories

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgTicket: Math.round(avgTicket * 100) / 100,
    revenueByCategory,
  }
}

function calculateQualityMetrics(requests: { service_rating: number | null }[]): {
  avgRating: number | null
  ratingDistribution: { rating: number; count: number }[]
  totalRatings: number
} {
  const ratedRequests = requests.filter(
    (r) => r.service_rating !== null && r.service_rating > 0
  )

  if (ratedRequests.length === 0) {
    return {
      avgRating: null,
      ratingDistribution: [],
      totalRatings: 0,
    }
  }

  const totalRating = ratedRequests.reduce((sum, r) => sum + (r.service_rating || 0), 0)
  const avgRating = Math.round((totalRating / ratedRequests.length) * 10) / 10

  // Distribution (1-5 stars)
  const distribution = new Map<number, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ])

  for (const request of ratedRequests) {
    const rating = Math.round(request.service_rating || 0)
    if (rating >= 1 && rating <= 5) {
      distribution.set(rating, (distribution.get(rating) || 0) + 1)
    }
  }

  const ratingDistribution = Array.from(distribution.entries())
    .map(([rating, count]) => ({ rating, count }))
    .sort((a, b) => a.rating - b.rating)

  return {
    avgRating,
    ratingDistribution,
    totalRatings: ratedRequests.length,
  }
}
