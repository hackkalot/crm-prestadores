// Analytics Types
// ================

export interface AnalyticsFilters {
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string   // YYYY-MM-DD
  district?: string
  category?: string
  service?: string
  providerId?: string // backoffice_provider_id
}

// ==================
// Summary / Overview
// ==================

export interface OperationalSummary {
  // Service Requests (pedidos reais criados by created_at)
  totalServiceRequests: number
  totalServiceRequestsPrevPeriod: number
  serviceRequestsTrend: number // percentage change
  avgRequestsPerDaySubmitted: number // average SRs/day submitted

  // Pedidos Agendados (by scheduled_to)
  totalScheduledRequests: number
  totalScheduledRequestsPrevPeriod: number
  scheduledRequestsTrend: number // percentage change
  avgRequestsPerDayScheduled: number // average SRs/day scheduled

  // Pedidos Enviados (oferecidos aos prestadores)
  totalSentRequests: number
  totalSentRequestsPrevPeriod: number
  sentRequestsTrend: number // percentage change

  // Pedidos Aceites (realmente alocados)
  totalAcceptedRequests: number
  totalAcceptedRequestsPrevPeriod: number
  acceptedRequestsTrend: number // percentage change

  // Legacy (keeping for backwards compatibility, maps to sent)
  totalRequests: number
  totalRequestsPrevMonth: number
  requestsTrend: number // percentage change
  totalAllocatedRequests: number
  totalAllocatedRequestsPrevPeriod: number
  allocatedRequestsTrend: number // percentage change

  // Acceptance Rate
  networkAcceptanceRate: number
  networkAcceptanceRatePrevMonth: number
  acceptanceTrend: number

  // Prestadores Ativos (unique assigned_provider_id in period)
  activeProvidersInPeriod: number
  activeProvidersInPeriodPrev: number
  activeProvidersTrend: number
  totalProvidersInNetwork: number // total providers for context

  // Rating Médio
  avgRating: number
  avgRatingPrevPeriod: number
  avgRatingTrend: number
  totalRatingsCount: number

  // Ticket Médio (teórico: Revenue / Service Requests)
  avgTicket: number
  avgTicketPrevPeriod: number
  avgTicketTrend: number

  // Ticket Médio Faturação (real: Revenue / Billing Processes)
  avgTicketBilling: number
  avgTicketBillingPrevPeriod: number
  avgTicketBillingTrend: number
  billingProcessesCount: number
  billingProcessesCountPrevPeriod: number

  // At Risk (kept for other uses)
  atRiskProvidersCount: number
  totalActiveProviders: number

  // Revenue Teórico (da tabela service_requests - paid_amount)
  totalRevenue: number
  totalRevenuePrevMonth: number
  revenueTrend: number

  // Revenue Real (da tabela billing_processes - total_invoice_value)
  totalRevenueBilling: number
  totalRevenueBillingPrevMonth: number
  revenueBillingTrend: number
}

// ==================
// Operational Health
// ==================

export interface AtRiskProvider {
  backofficeProviderId: number
  providerName: string
  requestsReceived: number
  requestsAccepted: number
  requestsExpired: number
  requestsRejected: number
  acceptanceRate: number
  expirationRate: number
  rejectionRate: number
  avgResponseTime: string | null
  periodFrom: string
  periodTo: string
  riskLevel: 'warning' | 'critical'
}

export interface SlaHealthIndicator {
  status: 'ok' | 'warning' | 'critical'
  label: string
  count: number
  percentage: number
}

export interface NetworkHealthData {
  indicators: SlaHealthIndicator[]
  totalProviders: number
  totalServiceRequests: number
  healthScore: number // 0-100, weighted score
}

export interface ResponseTimeDistribution {
  bucket: string // '0-4h', '4-12h', '12-24h', '24h+'
  count: number
  percentage: number
}

// ==================
// Network Performance
// ==================

export type TrendGranularity = 'day' | 'week' | 'month'

export interface AcceptanceTrendPoint {
  period: string // YYYY-MM-DD, YYYY-Www, or YYYY-MM depending on granularity
  periodLabel: string // Formatted label for display
  acceptanceRate: number
  expirationRate: number
  totalReceived: number
  totalAccepted: number
  totalExpired: number
}

export interface TrendData<T> {
  granularity: TrendGranularity
  data: T[]
}

export interface ProviderRankingItem {
  backofficeProviderId: number
  providerName: string
  requestsReceived: number
  requestsAccepted: number
  acceptanceRate: number
  expirationRate: number
  avgResponseTime: string | null
  rank: number
  // Additional metrics for unified ranking
  revenue?: number
  avgTicket?: number
  avgRating?: number
  completionRate?: number
}

export type RankingMetric =
  | 'volume'
  | 'acceptance'
  | 'expiration'
  | 'revenue'
  | 'avgTicket'
  | 'avgRating'

export interface RankingMetricOption {
  value: RankingMetric
  label: string
  description: string
}

export interface VolumeDistributionItem {
  providerName: string
  volume: number
  percentage: number
}

// ==================
// Financial
// ==================

export interface FinancialSummary {
  totalRevenue: number
  totalInvoiceValue: number
  avgTicket: number
  totalProcesses: number
  paidProcesses: number
  pendingProcesses: number
}

export interface RevenueByCategoryItem {
  category: string
  revenue: number
  count: number
  percentage: number
}

export interface TicketTrendPoint {
  period: string // YYYY-MM-DD, YYYY-Www, or YYYY-MM depending on granularity
  periodLabel: string // Formatted label for display
  avgTicket: number
  totalRevenue: number
  count: number
}

export interface PaymentStatusItem {
  status: string
  count: number
  value: number
  percentage: number
}

// ==================
// Quality
// ==================

export interface RatingTrendPoint {
  period: string // YYYY-MM-DD, YYYY-Www, or YYYY-MM depending on granularity
  periodLabel: string // Formatted label for display
  avgRating: number
  totalRatings: number
  networkAvgRating: number
}

export interface CompletionByCategoryItem {
  category: string
  totalRequests: number
  completedRequests: number
  completionRate: number
}

// Rating by category
export interface RatingByCategoryItem {
  category: string
  avgRating: number
  totalRatings: number
  ratingDistribution: { rating: number; count: number }[]
}

// Ticket by category
export interface TicketByCategoryItem {
  category: string
  avgTicket: number
  totalRevenue: number
  count: number
  percentage: number
}

// Completion trend (concluídos vs cancelados)
export interface CompletionTrendPoint {
  period: string
  periodLabel: string
  completed: number
  cancelled: number
  pending: number
  completionRate: number
  cancellationRate: number
}

// Low rating alerts
export interface LowRatingProvider {
  backofficeProviderId: number
  providerName: string
  avgRating: number
  totalRatings: number
  ratingsBelowThreshold: number
  percentBelowThreshold: number
  recentTrend: 'improving' | 'declining' | 'stable'
}

// Concentration analysis
export interface ConcentrationMetrics {
  topProviderShare: number // % do top 1
  top3Share: number // % do top 3
  top5Share: number // % do top 5
  herfindahlIndex: number // HHI (0-10000)
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  topProviders: { name: string; revenue: number; percentage: number }[]
}

// Network saturation / correlation analysis
export interface NetworkSaturationMetrics {
  volumeChange: number // % change in volume
  qualityChange: number // % change in completion/rating
  acceptanceChange: number // % change in acceptance
  expirationChange: number // % change in expiration
  correlationScore: number // -1 to 1 (negative = inverse correlation)
  status: 'healthy' | 'warning' | 'saturated'
  alerts: string[]
}

// Coverage gaps analysis
export interface CoverageGapItem {
  district: string
  totalRequests: number
  providersCount: number
  expirationRate: number
  acceptanceRate: number
  avgResponseTime: string | null
  riskLevel: 'ok' | 'warning' | 'critical'
  issues: string[]
}

export interface ComplaintMetrics {
  totalProcesses: number
  processesWithComplaints: number
  complaintRate: number
  complaintsByService: { service: string; count: number }[]
}

// Service requests by status
export interface ServicesByStatusItem {
  status: string
  label: string
  count: number
  percentage: number
  color: string
}

// ==================
// Network (Prestadores) KPIs
// ==================

export interface NetworkKPIs {
  // Nº médio serviços por prestador
  avgServicesPerProvider: number
  avgServicesPerProviderPrev: number
  avgServicesPerProviderTrend: number
  totalServices: number
  uniqueProviders: number

  // Rating médio do técnico (technician_rating)
  avgTechnicianRating: number
  avgTechnicianRatingPrev: number
  avgTechnicianRatingTrend: number
  totalTechnicianRatings: number

  // Rating médio do serviço (service_rating)
  avgServiceRating: number
  avgServiceRatingPrev: number
  avgServiceRatingTrend: number
  totalServiceRatings: number

  // Taxa de cancelamento por indisponibilidade de prestadores
  providerCancellationRate: number
  providerCancellationRatePrev: number
  providerCancellationRateTrend: number
  providerCancellationCount: number
  totalCancellations: number

  // Número de reagendamentos
  rescheduleCount: number
  rescheduleCountPrev: number
  rescheduleCountTrend: number
  rescheduleRate: number

  // Serviços com custos adicionais
  additionalChargesCount: number
  additionalChargesCountPrev: number
  additionalChargesCountTrend: number
  additionalChargesRate: number
  totalAdditionalChargesValue: number
}

// ==================
// Provider Metrics Charts (Rede tab)
// ==================

export interface ProviderMetricItem {
  backofficeProviderId: number
  providerName: string
  count: number
  percentage: number
}

// ==================
// Filter Options
// ==================

export interface AnalyticsFilterOptions {
  districts: string[]
  categories: string[]
  categoryServices: Record<string, string[]> // Map: category -> list of services
  providers: { id: number; name: string }[]
  periods: { from: string; to: string }[]
}

// ==================
// Period Comparison
// ==================

export interface PeriodComparison {
  current: number
  previous: number
  change: number
  changePercent: number
}
