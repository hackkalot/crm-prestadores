// Priority system types
// Strict TypeScript types for priority/KPI tracking

export type PriorityType = 'ativar_prestadores' | 'concluir_onboardings' | 'outro'
export type PriorityUrgency = 'baixa' | 'media' | 'alta' | 'urgente'
export type PriorityStatus = 'ativa' | 'concluida' | 'cancelada'

export interface PriorityCriteria {
  services?: string[]
  districts?: string[]
  entity_types?: ('tecnico' | 'eni' | 'empresa')[]
  provider_status?: ('novo' | 'em_onboarding' | 'ativo' | 'suspenso' | 'abandonado')[]
}

export interface Priority {
  id: string
  title: string
  description?: string | null

  // Type and criteria
  type: PriorityType
  criteria: PriorityCriteria

  // Target and progress
  target_value: number
  current_value: number
  current_active_count: number
  unit?: string | null

  // Temporal
  deadline?: string | null
  urgency: PriorityUrgency

  // Status
  status: PriorityStatus

  // Tracking
  created_by: string
  created_at: string
  completed_at?: string | null
  completed_by?: string | null
  completion_notes?: string | null
  was_successful?: boolean | null
  cancelled_at?: string | null
  deleted_at?: string | null
  deleted_by?: string | null

  // Baseline
  baseline_provider_count?: number | null
  baseline_onboarding_count?: number | null
  calculation_metadata?: Record<string, unknown> | null

  updated_at: string
}

export interface PriorityWithAssignments extends Priority {
  assignments?: PriorityAssignment[]
}

export interface PriorityWithUser extends Priority {
  created_by_user?: {
    id: string
    name: string
    email: string
  } | null
}

export interface PriorityAssignment {
  id: string
  priority_id: string
  user_id: string
  assigned_at: string
  assigned_by?: string | null

  // Relations
  user?: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

export interface PriorityProgressLog {
  id: string
  priority_id: string
  old_value: number
  new_value: number
  change_reason?: string | null
  provider_id?: string | null
  changed_at: string
  changed_by?: string | null
  note?: string | null

  // Relations
  changed_by_user?: {
    id: string
    name: string
  } | null
  provider?: {
    id: string
    name: string
  } | null
}

// Form types for creating/updating priorities
export interface CreatePriorityFormData {
  title: string
  description?: string
  type: PriorityType
  criteria: PriorityCriteria
  target_value: number
  unit?: string
  deadline?: string
  urgency: PriorityUrgency
  assigned_user_ids: string[]
}

export interface UpdatePriorityProgressFormData {
  priority_id: string
  new_value: number
  note?: string
  change_reason?: string
}

// Utility types
export type PriorityFilters = {
  status?: PriorityStatus
  type?: PriorityType
  urgency?: PriorityUrgency
  assigned_to?: string
  created_by?: string
}

export const PRIORITY_TYPE_LABELS: Record<PriorityType, string> = {
  ativar_prestadores: 'Ativar Prestadores',
  concluir_onboardings: 'Concluir Onboardings',
  outro: 'Outro',
}

export const PRIORITY_URGENCY_LABELS: Record<PriorityUrgency, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const PRIORITY_STATUS_LABELS: Record<PriorityStatus, string> = {
  ativa: 'Ativa',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

export const PRIORITY_URGENCY_VARIANTS = {
  baixa: 'secondary',
  media: 'default',
  alta: 'warning',
  urgente: 'destructive',
} as const

export const PRIORITY_STATUS_VARIANTS = {
  ativa: 'info',
  concluida: 'success',
  cancelada: 'secondary',
} as const
