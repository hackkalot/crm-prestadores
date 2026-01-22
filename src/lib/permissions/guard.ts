'use server'

import { redirect } from 'next/navigation'
import { canCurrentUserAccessPage, getUserAccessiblePages } from './actions'

/**
 * Guard function to require page access
 * Redirects to first accessible page if user doesn't have access
 */
export async function requirePageAccess(pageKey: string): Promise<void> {
  const hasAccess = await canCurrentUserAccessPage(pageKey)

  if (!hasAccess) {
    // Get first accessible page for redirect
    const accessiblePages = await getUserAccessiblePages()

    if (accessiblePages.length === 0) {
      // No pages accessible - this shouldn't happen normally
      redirect('/login')
    }

    // Redirect to first accessible page (usually candidaturas for most users)
    const firstPage = accessiblePages[0]
    const pageRoutes: Record<string, string> = {
      candidaturas: '/candidaturas',
      onboarding: '/onboarding',
      kpis: '/kpis',
      agenda: '/agenda',
      prestadores: '/prestadores',
      rede: '/rede',
      kpis_operacionais: '/kpis-operacionais',
      pedidos: '/pedidos',
      alocacoes: '/alocacoes',
      faturacao: '/faturacao',
      reports: '/reports',
      prioridades: '/prioridades',
      analytics: '/analytics',
      configuracoes: '/configuracoes',
      admin_utilizadores: '/admin/gestao-sistema',
    }

    const redirectPath = pageRoutes[firstPage] || '/candidaturas'
    redirect(redirectPath)
  }
}

/**
 * Check if user has access to at least one page in a section
 */
export async function hasAccessToSection(
  sectionKey: string,
  accessiblePages: string[]
): Promise<boolean> {
  const sectionPages: Record<string, string[]> = {
    onboarding: ['candidaturas', 'onboarding', 'kpis', 'agenda'],
    rede: ['prestadores', 'rede', 'kpis_operacionais', 'pedidos', 'alocacoes', 'faturacao', 'reports'],
    gestao: ['prioridades', 'analytics'],
    admin: ['admin_utilizadores'],
  }

  const pagesInSection = sectionPages[sectionKey] || []
  return pagesInSection.some(page => accessiblePages.includes(page))
}
