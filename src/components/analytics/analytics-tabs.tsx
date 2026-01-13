'use client'

import { useCallback, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ANALYTICS_TABS } from '@/lib/analytics/constants'

interface AnalyticsTabsProps {
  defaultValue?: string
}

export function AnalyticsTabs({ defaultValue = 'overview' }: AnalyticsTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentTab = searchParams.get('tab') || defaultValue

  const handleTabChange = useCallback(
    (value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', value)
        router.push(`/analytics?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <TabsList className="w-fit">
        {ANALYTICS_TABS.map((tab) => (
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
