'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to check if the component has mounted on the client.
 * Useful for avoiding hydration mismatches with Radix UI components
 * that generate different IDs on server vs client.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}
