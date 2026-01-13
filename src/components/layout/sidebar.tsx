'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth/actions'
import { Badge } from '@/components/ui/badge'
import { getOriginContext } from '@/hooks/use-navigation-state'
import { useMounted } from '@/hooks/use-mounted'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Kanban,
  UserCheck,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Network,
  Shield,
  Target,
  FileText,
  Receipt,
  GitBranch,
  ChevronUp,
  TrendingUp,
} from 'lucide-react'

const navigation = [
  { name: 'Candidaturas', href: '/candidaturas', icon: Users, contextTab: 'candidatura', originKey: 'candidaturas' },
  { name: 'Onboarding', href: '/onboarding', icon: Kanban, contextTab: 'onboarding', originKey: 'onboarding' },
  { name: 'Prestadores', href: '/prestadores', icon: UserCheck, contextTab: 'perfil', originKey: 'prestadores' },
  { name: 'Pedidos', href: '/pedidos', icon: FileText, originKey: 'pedidos' },
  { name: 'Alocações', href: '/alocacoes', icon: GitBranch, originKey: 'alocacoes' },
  { name: 'Faturação', href: '/faturacao', icon: Receipt, originKey: 'faturacao' },
  { name: 'Rede', href: '/rede', icon: Network },
  { name: 'Agenda', href: '/agenda', icon: Calendar },
  { name: 'KPIs', href: '/kpis', icon: BarChart3 },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

const managerNavigation = [
  { name: 'Prioridades', href: '/prioridades', icon: Target },
]

const adminNavigation = [
  { name: 'Utilizadores', href: '/admin/utilizadores', icon: Shield },
]

interface SidebarProps {
  user?: {
    name: string
    email: string
    role?: 'admin' | 'user' | 'manager' | 'relationship_manager'
  } | null
  pendingUsersCount?: number
}

export function Sidebar({ user, pendingUsersCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')
  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager' || user?.role === 'admin'
  const isMounted = useMounted()

  // Check if we're on a detail page (provider or pedido)
  const isProviderPage = pathname.startsWith('/providers/')
  const isPedidoPage = pathname.startsWith('/pedidos/') && pathname !== '/pedidos'

  // Get origin context from session storage (only on client)
  const originContext = isMounted ? getOriginContext() : null

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/candidaturas" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">F</span>
          </div>
          <span className="font-semibold text-lg">FIXO CRM</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          // Verificar se está ativo por pathname direto
          const isActiveByPath = pathname.startsWith(item.href)

          // Verificar se está ativo por contexto de tab em /providers/[id]
          const isActiveByTab = isProviderPage && item.contextTab && currentTab === item.contextTab

          // Verificar se está ativo por contexto de origem (para navegação de alocações/faturação)
          const isActiveByOrigin = isMounted && (isProviderPage || isPedidoPage) &&
            item.originKey && originContext === item.originKey

          const isActive = isActiveByTab || isActiveByPath || isActiveByOrigin
          return (
            <Link
              key={item.name}
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
        })}

        {/* Manager Navigation */}
        {isManager && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Gestão
              </p>
            </div>
            {managerNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
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
            })}
          </>
        )}

        {/* Admin Navigation */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
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
                  {pendingUsersCount > 0 && (
                    <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">
                      {pendingUsersCount}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t p-2">
        {user && isMounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-accent transition-colors">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-medium text-sm">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-56"
              sideOffset={8}
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <span className="text-primary-foreground font-semibold">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role === 'relationship_manager' ? 'RM' : user.role || 'User'}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await logout()
                }}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Terminar Sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
