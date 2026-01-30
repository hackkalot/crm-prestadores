'use client'

import Link from 'next/link'
import { logout } from '@/lib/auth/actions'
import { useMounted } from '@/hooks/use-mounted'
import { SidebarSection, StandaloneLink, type NavItem } from './sidebar-section'
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
  Shield,
  Target,
  FileText,
  Receipt,
  GitBranch,
  ChevronUp,
  TrendingUp,
  FileBarChart,
  Map,
  ClipboardList,
} from 'lucide-react'

// Define sections with their items
const SIDEBAR_SECTIONS: Array<{
  key: string
  label: string
  items: NavItem[]
  defaultCollapsed?: boolean
}> = [
  {
    key: 'onboarding',
    label: 'Onboarding',
    items: [
      { key: 'candidaturas', name: 'Candidaturas', href: '/candidaturas', icon: Users, contextTab: 'candidatura', originKey: 'candidaturas' },
      { key: 'onboarding', name: 'Onboarding', href: '/onboarding', icon: Kanban, contextTab: 'onboarding', originKey: 'onboarding' },
      { key: 'submissoes', name: 'Submissões', href: '/onboarding/submissoes', icon: ClipboardList },
      { key: 'kpis', name: "KPI's", href: '/kpis', icon: BarChart3 },
      { key: 'agenda', name: 'Agenda', href: '/agenda', icon: Calendar },
    ],
  },
  {
    key: 'rede',
    label: 'Rede',
    items: [
      { key: 'prestadores', name: 'Prestadores', href: '/prestadores', icon: UserCheck, contextTab: 'perfil', originKey: 'prestadores' },
      { key: 'rede', name: 'Rede', href: '/rede', icon: Map },
      { key: 'kpis_operacionais', name: "KPI's Operacionais", href: '/analytics?context=kpis', icon: TrendingUp },
    ],
  },
  {
    key: 'dados',
    label: 'Dados',
    defaultCollapsed: true,
    items: [
      { key: 'pedidos', name: 'Pedidos', href: '/pedidos', icon: FileText, originKey: 'pedidos' },
      { key: 'alocacoes', name: 'Alocações', href: '/alocacoes', icon: GitBranch, originKey: 'alocacoes' },
      { key: 'faturacao', name: 'Faturação', href: '/faturacao', icon: Receipt, originKey: 'faturacao' },
    ],
  },
  {
    key: 'gestao',
    label: 'Gestão',
    items: [
      { key: 'analytics', name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { key: 'reports', name: 'Reports', href: '/reports', icon: FileBarChart },
      { key: 'prioridades', name: 'Prioridades', href: '/prioridades', icon: Target },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    items: [
      { key: 'admin_utilizadores', name: 'Gestão de Sistema', href: '/admin/gestao-sistema', icon: Shield },
    ],
  },
]

// Standalone items (no section)
const STANDALONE_ITEMS: NavItem[] = [
  { key: 'configuracoes', name: 'Configurações', href: '/configuracoes', icon: Settings },
]

interface SidebarProps {
  user?: {
    name: string
    email: string
    role?: 'admin' | 'user' | 'manager' | 'relationship_manager'
  } | null
  pendingUsersCount?: number
  accessiblePages?: string[]
}

export function Sidebar({ user, pendingUsersCount = 0, accessiblePages = [] }: SidebarProps) {
  const isMounted = useMounted()

  // Add badge to admin_utilizadores if there are pending users
  const sectionsWithBadges = SIDEBAR_SECTIONS.map(section => {
    if (section.key === 'admin') {
      return {
        ...section,
        items: section.items.map(item => {
          if (item.key === 'admin_utilizadores' && pendingUsersCount > 0) {
            return { ...item, badge: pendingUsersCount }
          }
          return item
        }),
      }
    }
    return section
  })

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
      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {/* Sections */}
        {sectionsWithBadges.map((section) => (
          <SidebarSection
            key={section.key}
            sectionKey={section.key}
            label={section.label}
            items={section.items}
            accessiblePages={accessiblePages}
            defaultCollapsed={section.defaultCollapsed}
          />
        ))}

        {/* Divider before standalone items */}
        <div className="border-t my-2" />

        {/* Standalone items */}
        {STANDALONE_ITEMS.map((item) => (
          <StandaloneLink
            key={item.key}
            item={item}
            accessiblePages={accessiblePages}
          />
        ))}
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
                Terminar Sessao
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
