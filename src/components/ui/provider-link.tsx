'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { saveBackUrl } from '@/hooks/use-navigation-state'

interface ProviderLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

/**
 * A link component that saves the current URL (with filters) to sessionStorage
 * before navigating to the provider detail page.
 * This allows the back button to return to the exact same page with filters.
 */
export function ProviderLink({ href, children, className }: ProviderLinkProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleClick = () => {
    // Build the full URL with query params
    const queryString = searchParams.toString()
    const fullUrl = queryString ? `${pathname}?${queryString}` : pathname
    saveBackUrl(fullUrl)
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  )
}
