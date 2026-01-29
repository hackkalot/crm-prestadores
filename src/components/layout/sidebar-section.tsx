'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { getOriginContext } from '@/hooks/use-navigation-state'
import { useMounted } from '@/hooks/use-mounted'

export interface NavItem {
  key: string
  name: string
  href: string
  icon: LucideIcon
  contextTab?: string
  originKey?: string
  badge?: number
}

interface SidebarSectionProps {
  sectionKey: string
  label: string
  items: NavItem[]
  accessiblePages: string[]
  defaultCollapsed?: boolean
}

export function SidebarSection({
  sectionKey,
  label,
  items,
  accessiblePages,
  defaultCollapsed = false,
}: SidebarSectionProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')
  const contextParam = searchParams.get('context')
  const isMounted = useMounted()

  // Filter items based on permissions
  const visibleItems = items.filter(item => accessiblePages.includes(item.key))

  // Collapsed state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  useEffect(() => {
    if (isMounted) {
      const stored = localStorage.getItem(`sidebar-${sectionKey}-collapsed`)
      if (stored !== null) {
        setIsCollapsed(stored === 'true')
      }
    }
  }, [sectionKey, isMounted])

  const toggleCollapsed = () => {
    const newValue = !isCollapsed
    setIsCollapsed(newValue)
    localStorage.setItem(`sidebar-${sectionKey}-collapsed`, String(newValue))
  }

  // Check if we're on a detail page
  const isProviderPage = pathname.startsWith('/providers/')
  const isPedidoPage = pathname.startsWith('/pedidos/') && pathname !== '/pedidos'

  // Get origin context from session storage
  const originContext = isMounted ? getOriginContext() : null

  // Check if path matches (exact match or sub-path with /)
  // But prioritize more specific matches (longer paths)
  const isPathMatch = (itemHref: string, itemKey: string) => {
    // Special case: /analytics?context=kpis should highlight kpis_operacionais, not analytics
    if (pathname === '/analytics' && contextParam === 'kpis') {
      return itemKey === 'kpis_operacionais'
    }
    // When on /analytics without context=kpis, only analytics should be active
    if (pathname === '/analytics' && !contextParam) {
      return itemKey === 'analytics'
    }

    if (pathname === itemHref) return true
    // Only match sub-paths if they start with href + "/"
    // This prevents /kpis matching /kpis-operacionais
    if (!pathname.startsWith(itemHref + '/')) return false

    // Check if there's a more specific item that matches
    // e.g., /onboarding should not match when /onboarding/submissoes exists and matches
    const hasMoreSpecificMatch = visibleItems.some(other =>
      other.href !== itemHref &&
      other.href.startsWith(itemHref + '/') &&
      (pathname === other.href || pathname.startsWith(other.href + '/'))
    )

    return !hasMoreSpecificMatch
  }

  // Check if any item in this section is active
  const hasActiveItem = visibleItems.some(item => {
    const isActiveByPath = isPathMatch(item.href, item.key)
    const isActiveByTab = isProviderPage && item.contextTab && currentTab === item.contextTab
    const isActiveByOrigin = isMounted && (isProviderPage || isPedidoPage) &&
      item.originKey && originContext === item.originKey
    return isActiveByPath || isActiveByTab || isActiveByOrigin
  })

  // If no visible items, don't render the section
  if (visibleItems.length === 0) {
    return null
  }

  return (
    <div className="space-y-1">
      {/* Section header */}
      <button
        onClick={toggleCollapsed}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isCollapsed && '-rotate-90'
          )}
        />
      </button>

      {/* Section items */}
      {!isCollapsed && (
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const isActiveByPath = isPathMatch(item.href, item.key)
            const isActiveByTab = isProviderPage && item.contextTab && currentTab === item.contextTab
            const isActiveByOrigin = isMounted && (isProviderPage || isPedidoPage) &&
              item.originKey && originContext === item.originKey
            const isActive = isActiveByPath || isActiveByTab || isActiveByOrigin

            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Standalone link component (for items without a section, like Configuracoes)
interface StandaloneLinkProps {
  item: NavItem
  accessiblePages: string[]
}

export function StandaloneLink({ item, accessiblePages }: StandaloneLinkProps) {
  const pathname = usePathname()

  // Check if user has access
  if (!accessiblePages.includes(item.key)) {
    return null
  }

  // Exact match or sub-path with /
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.name}
    </Link>
  )
}
