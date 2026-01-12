'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getBackUrl, clearBackUrl } from '@/hooks/use-navigation-state'
import { useMounted } from '@/hooks/use-mounted'

interface BackButtonProps {
  fallbackUrl: string
}

/**
 * Back button that navigates to the previously saved URL (with filters),
 * or falls back to the provided URL if no saved URL exists.
 */
export function BackButton({ fallbackUrl }: BackButtonProps) {
  const router = useRouter()
  const mounted = useMounted()

  const handleClick = () => {
    const backUrl = getBackUrl(fallbackUrl)
    clearBackUrl()
    router.push(backUrl)
  }

  // During SSR, render a simple placeholder
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleClick}>
      <ArrowLeft className="h-4 w-4" />
    </Button>
  )
}
