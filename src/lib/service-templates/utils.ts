import type { Database } from '@/types/database'

export type ServiceTemplate = Database['public']['Tables']['service_templates']['Row']

export interface ServiceTemplateSections {
  includes?: string[]
  excludes?: string[]
  importantNotes?: string[]
}

/**
 * Parse sections JSON from template
 */
export function parseTemplateSections(
  sections: unknown
): ServiceTemplateSections {
  if (!sections || typeof sections !== 'object') {
    return {}
  }

  const s = sections as Record<string, unknown>

  return {
    includes: Array.isArray(s.includes) ? s.includes : undefined,
    excludes: Array.isArray(s.excludes) ? s.excludes : undefined,
    importantNotes: Array.isArray(s.importantNotes) ? s.importantNotes : undefined,
  }
}
