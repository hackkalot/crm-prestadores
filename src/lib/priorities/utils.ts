import type { Priority, PriorityCriteria } from '@/types/priorities'

/**
 * Build URL with filters based on priority criteria
 * Used when clicking on a priority card to redirect to /prestadores with filters applied
 */
export function buildPriorityFilterUrl(priority: Priority): string {
  const params = new URLSearchParams()
  const criteria = priority.criteria

  // Add criteria-based filters
  if (criteria.services && criteria.services.length > 0) {
    // Only add first service (URL can't handle multiple easily)
    params.set('service', criteria.services[0])
  }

  if (criteria.districts && criteria.districts.length > 0) {
    // Only add first district
    params.set('district', criteria.districts[0])
  }

  if (criteria.entity_types && criteria.entity_types.length > 0) {
    // Only add first entity type
    params.set('entityType', criteria.entity_types[0])
  }

  // Add status filter based on priority type
  if (priority.type === 'ativar_prestadores') {
    // Show providers that could be activated (novo, em_onboarding)
    params.set('status', 'novo')
  } else if (priority.type === 'concluir_onboardings') {
    // Show providers in onboarding
    params.set('status', 'em_onboarding')
  } else if (criteria.provider_status && criteria.provider_status.length > 0) {
    // Use first status from criteria
    params.set('status', criteria.provider_status[0])
  }

  return `/prestadores?${params.toString()}`
}

/**
 * Check if a provider matches priority criteria
 * Used for filtered recalculation to only update matching priorities
 */
export function providerMatchesCriteria(
  provider: {
    services?: string[] | null
    districts?: string[] | null
    entity_type: string
  },
  criteria: PriorityCriteria
): boolean {
  // Check services
  if (criteria.services && criteria.services.length > 0) {
    if (!provider.services || provider.services.length === 0) {
      return false
    }
    const hasMatchingService = provider.services.some((s) =>
      criteria.services!.includes(s)
    )
    if (!hasMatchingService) {
      return false
    }
  }

  // Check districts
  if (criteria.districts && criteria.districts.length > 0) {
    if (!provider.districts || provider.districts.length === 0) {
      return false
    }
    const hasMatchingDistrict = provider.districts.some((d) =>
      criteria.districts!.includes(d)
    )
    if (!hasMatchingDistrict) {
      return false
    }
  }

  // Check entity types
  if (criteria.entity_types && criteria.entity_types.length > 0) {
    if (!criteria.entity_types.includes(provider.entity_type as any)) {
      return false
    }
  }

  return true
}

/**
 * Calculate progress percentage
 */
export function calculateProgressPercentage(
  currentValue: number,
  targetValue: number
): number {
  if (targetValue === 0) return 0
  return Math.min(Math.round((currentValue / targetValue) * 100), 100)
}

/**
 * Format priority deadline for display
 */
export function formatPriorityDeadline(deadline: string | null): string {
  if (!deadline) return 'Sem prazo'

  const date = new Date(deadline)
  const now = new Date()
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays < 0) {
    return `Atrasado ${Math.abs(diffDays)} dias`
  } else if (diffDays === 0) {
    return 'Hoje'
  } else if (diffDays === 1) {
    return 'Amanhã'
  } else if (diffDays <= 7) {
    return `${diffDays} dias`
  } else {
    return date.toLocaleDateString('pt-PT')
  }
}

/**
 * Check if priority is approaching deadline
 */
export function isApproachingDeadline(
  deadline: string | null,
  daysThreshold: number = 7
): boolean {
  if (!deadline) return false

  const date = new Date(deadline)
  const now = new Date()
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  return diffDays >= 0 && diffDays <= daysThreshold
}

/**
 * Check if priority is overdue
 */
export function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false

  const date = new Date(deadline)
  const now = new Date()

  return date < now
}

/**
 * Get priority health status based on progress and deadline
 */
export function getPriorityHealth(priority: Priority): 'good' | 'warning' | 'danger' {
  const progress = calculateProgressPercentage(
    priority.current_value,
    priority.target_value
  )

  // If completed, it's good
  if (priority.status === 'concluida') {
    return 'good'
  }

  // If no deadline, base on progress only
  if (!priority.deadline) {
    if (progress >= 75) return 'good'
    if (progress >= 50) return 'warning'
    return 'danger'
  }

  // With deadline, check if on track
  const deadline = new Date(priority.deadline)
  const created = new Date(priority.created_at)
  const now = new Date()

  const totalTime = deadline.getTime() - created.getTime()
  const elapsedTime = now.getTime() - created.getTime()
  const timeProgress = Math.min((elapsedTime / totalTime) * 100, 100)

  // If overdue and not complete
  if (isOverdue(priority.deadline)) {
    return 'danger'
  }

  // If approaching deadline
  if (isApproachingDeadline(priority.deadline, 3)) {
    if (progress >= 80) return 'warning'
    return 'danger'
  }

  // Check if falling behind schedule
  if (timeProgress > progress + 20) {
    // More than 20% behind schedule
    return 'danger'
  } else if (timeProgress > progress + 10) {
    // 10-20% behind schedule
    return 'warning'
  }

  return 'good'
}
