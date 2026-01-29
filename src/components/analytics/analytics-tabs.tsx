'use client'

import { useCallback, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ANALYTICS_TABS } from '@/lib/analytics/constants'

interface AnalyticsTabsProps {
  defaultValue?: string
  tabs?: readonly { value: string; label: string }[]
}

export function AnalyticsTabs({ defaultValue = 'overview', tabs = ANALYTICS_TABS }: AnalyticsTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const currentTab = searchParams.get('tab') || defaultValue

  const handleTabChange = useCallback(
    (value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', value)
        // Use replace instead of push to avoid history stack buildup
        // scroll: false prevents jumping to top of page
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [router, searchParams, pathname]
  )

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <TabsList className="w-fit">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={isPending}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
