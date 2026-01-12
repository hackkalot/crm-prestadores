'use client'

const BACK_URL_KEY = 'provider_back_url'

/**
 * Save the current URL (with filters) before navigating to provider detail.
 * This allows the back button to return to the same page with filters preserved.
 */
export function saveBackUrl(url: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(BACK_URL_KEY, url)
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
 * Clear the saved back URL.
 */
export function clearBackUrl() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(BACK_URL_KEY)
  }
}
