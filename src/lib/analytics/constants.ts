// Analytics Constants
// ====================

// SLA Thresholds for provider health
export const SLA_THRESHOLDS = {
  // Expiration Rate thresholds
  EXPIRATION_RATE: {
    OK: 10,       // <= 10% is healthy (green)
    WARNING: 20,  // 10-20% is at risk (yellow)
    CRITICAL: 30, // > 30% is critical (red)
  },

  // Response Time in hours
  RESPONSE_TIME_HOURS: {
    FAST: 4,      // <= 4h is fast (green)
    NORMAL: 12,   // 4-12h is normal (yellow)
    SLOW: 24,     // > 24h is slow (red)
  },

  // Acceptance Rate thresholds
  ACCEPTANCE_RATE: {
    LOW: 40,      // < 40% is low (red)
    MEDIUM: 70,   // 40-70% is medium (yellow)
    HIGH: 70,     // > 70% is high (green)
  },

  // Minimum volume to be considered for at-risk analysis
  MIN_VOLUME_FOR_ANALYSIS: 5,
} as const

// Colors for charts and indicators
export const ANALYTICS_COLORS = {
  // Status colors
  OK: '#22c55e',      // green-500
  WARNING: '#f59e0b', // amber-500
  CRITICAL: '#ef4444', // red-500

  // Chart colors
  PRIMARY: '#3b82f6',   // blue-500
  SECONDARY: '#8b5cf6', // violet-500
  ACCENT: '#06b6d4',    // cyan-500
  MUTED: '#94a3b8',     // slate-400

  // Financial
  REVENUE: '#22c55e',   // green-500
  PENDING: '#f59e0b',   // amber-500
  PAID: '#3b82f6',      // blue-500
} as const

// Response time buckets for distribution chart
export const RESPONSE_TIME_BUCKETS = [
  { label: '0-4h', maxHours: 4 },
  { label: '4-12h', maxHours: 12 },
  { label: '12-24h', maxHours: 24 },
  { label: '24h+', maxHours: Infinity },
] as const

// Billing process statuses (from backoffice)
export const BILLING_STATUSES = {
  POR_ENVIAR: 'por enviar',
  EM_ANALISE: 'em análise',
  NAO_ACEITE: 'não aceite',
  ACEITE: 'aceite',
  PAGO: 'pago',
  ARQUIVADO: 'arquivado',
} as const

// Service request statuses (from database enum)
export const SERVICE_REQUEST_STATUSES = {
  NOVO_PEDIDO: 'Novo Pedido',
  ATRIBUIR_PRESTADOR: 'Atribuir Prestador',
  AGENDADO: 'Agendado',
  EM_EXECUCAO: 'Em Execução',
  CONCLUIDO: 'Concluído',
  CANCELADO_CLIENTE: 'Cancelado Cliente',
  CANCELADO_BACKOFFICE: 'Cancelado Backoffice',
  CANCELADO_PRESTADOR: 'Cancelado Prestador',
} as const

// Map database status values to display labels
// Note: Database uses formatted strings with accents and spaces
export const SERVICE_REQUEST_STATUS_LABELS: Record<string, string> = {
  // Actual database values
  'Novo pedido': 'Novo Pedido',
  'Atribuir prestador': 'Atribuir Prestador',
  'Prestador atribuído': 'Prestador Atribuído',
  'Em curso': 'Em Curso',
  'Concluído': 'Concluído',
  'Cancelado': 'Cancelado',
  'Cancelado (backoffice)': 'Canc. (Backoffice)',
  'Cancelado (Edição de RR)': 'Canc. (Edição RR)',
  'Cancelado (concluído sem sucesso)': 'Canc. (Sem Sucesso)',
  'Expirado': 'Expirado',
  // Legacy snake_case values (just in case)
  'novo_pedido': 'Novo Pedido',
  'atribuir_prestador': 'Atribuir Prestador',
  'agendado': 'Agendado',
  'em_execucao': 'Em Execução',
  'concluido': 'Concluído',
  'cancelado_cliente': 'Canc. Cliente',
  'cancelado_backoffice': 'Canc. Backoffice',
  'cancelado_prestador': 'Canc. Prestador',
}

// Colors for service request statuses
// Note: Database uses formatted strings with accents and spaces
export const SERVICE_REQUEST_STATUS_COLORS: Record<string, string> = {
  // Actual database values
  'Novo pedido': '#3b82f6',                    // blue-500
  'Atribuir prestador': '#8b5cf6',             // violet-500
  'Prestador atribuído': '#06b6d4',            // cyan-500
  'Em curso': '#f59e0b',                       // amber-500
  'Concluído': '#22c55e',                      // green-500
  'Cancelado': '#ef4444',                      // red-500
  'Cancelado (backoffice)': '#dc2626',         // red-600
  'Cancelado (Edição de RR)': '#f97316',       // orange-500
  'Cancelado (concluído sem sucesso)': '#b91c1c', // red-700
  'Expirado': '#6b7280',                       // gray-500
  // Legacy snake_case values (just in case)
  'novo_pedido': '#3b82f6',       // blue-500
  'atribuir_prestador': '#8b5cf6', // violet-500
  'agendado': '#06b6d4',           // cyan-500
  'em_execucao': '#f59e0b',        // amber-500
  'concluido': '#22c55e',          // green-500
  'cancelado_cliente': '#ef4444',  // red-500
  'cancelado_backoffice': '#dc2626', // red-600
  'cancelado_prestador': '#b91c1c',  // red-700
}

// Date presets for filters
export const DATE_PRESETS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '1 ano', days: 365 },
] as const

// Ranking metric options for provider rankings
export const RANKING_METRICS = [
  {
    value: 'volume' as const,
    label: 'Volume',
    description: 'Pedidos recebidos',
  },
  {
    value: 'acceptance' as const,
    label: 'Taxa Aceitação',
    description: 'Pedidos aceites / recebidos',
  },
  {
    value: 'revenue' as const,
    label: 'Revenue',
    description: 'Valor total faturado',
  },
  {
    value: 'avgTicket' as const,
    label: 'Ticket médio',
    description: 'Valor medio por pedido',
  },
  {
    value: 'avgRating' as const,
    label: 'Rating',
    description: 'Avaliação média do serviço',
  },
  {
    value: 'expiration' as const,
    label: 'Taxa Expiração',
    description: 'Pedidos expirados / recebidos',
  },
] as const

// Analytics tab definitions
export const ANALYTICS_TABS = [
  { value: 'overview', label: 'Visão Geral' },
  { value: 'operational', label: 'Operacional' },
  { value: 'network', label: 'Rede' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'quality', label: 'Qualidade' },
] as const
