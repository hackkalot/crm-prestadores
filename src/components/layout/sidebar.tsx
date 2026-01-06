'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth/actions'
import {
  Users,
  Kanban,
  UserCheck,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Network,
} from 'lucide-react'

const navigation = [
  { name: 'Candidaturas', href: '/candidaturas', icon: Users },
  { name: 'Onboarding', href: '/onboarding', icon: Kanban },
  { name: 'Prestadores', href: '/prestadores', icon: UserCheck },
  { name: 'Rede', href: '/rede', icon: Network },
  { name: 'Agenda', href: '/agenda', icon: Calendar },
  { name: 'KPIs', href: '/kpis', icon: BarChart3 },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

interface SidebarProps {
  user?: {
    name: string
    email: string
  } | null
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

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
      </nav>

      {/* User section */}
      <div className="border-t p-4 space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-medium text-sm">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </form>
      </div>
    </div>
  )
}
