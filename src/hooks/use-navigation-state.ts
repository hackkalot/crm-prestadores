'use client'

const BACK_URL_KEY = 'provider_back_url'
const ORIGIN_CONTEXT_KEY = 'navigation_origin_context'

/**
 * Save the current URL (with filters) before navigating to provider detail.
 * This allows the back button to return to the same page with filters preserved.
 * Also saves the origin context (e.g., 'alocacoes', 'faturacao') for sidebar highlighting.
 */
export function saveBackUrl(url: string, originContext?: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(BACK_URL_KEY, url)
    if (originContext) {
      sessionStorage.setItem(ORIGIN_CONTEXT_KEY, originContext)
    }
  }
}

/**
 * Get the saved back URL, or return the fallback URL.
 */
export function getBackUrl(fallbackUrl: string): string {
  if (typeof window !== 'undefined') {
    const savedUrl = sessionStorage.getItem(BACK_URL_KEY)
    if (savedUrl) {
      return savedUrl
    }
  }
  return fallbackUrl
}

/**
 * Get the origin context (which page the user came from).
 * Returns null if no context is saved.
 */
export function getOriginContext(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(ORIGIN_CONTEXT_KEY)
  }
  return null
}

/**
 * Clear the saved back URL and origin context.
 */
export function clearBackUrl() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(BACK_URL_KEY)
    sessionStorage.removeItem(ORIGIN_CONTEXT_KEY)
  }
}
