import { ThemeToggle } from '@/components/theme-toggle'
import { AlertsBell } from '@/components/alerts/alerts-bell'
import { PrioritiesBell } from '@/components/priorities/priorities-bell'
import { MobileMenuButton } from './mobile-menu-button'

interface HeaderProps {
  title: string
  description?: string
  backButton?: React.ReactNode
  action?: React.ReactNode
  syncInfo?: React.ReactNode
}

export function Header({ title, description, backButton, action, syncInfo }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <MobileMenuButton />

        {backButton}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg lg:text-xl font-semibold truncate">{title}</h1>
            {syncInfo}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 lg:gap-2">
        {/* Action button */}
        {action}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Priorities */}
        <PrioritiesBell />

        {/* Alerts */}
        <AlertsBell />
      </div>
    </header>
  )
}
