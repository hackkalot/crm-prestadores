import { ThemeToggle } from '@/components/theme-toggle'
import { AlertsBell } from '@/components/alerts/alerts-bell'
import { PrioritiesBell } from '@/components/priorities/priorities-bell'

interface HeaderProps {
  title: string
  description?: string
  backButton?: React.ReactNode
}

export async function Header({ title, description, backButton }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-3">
        {backButton}
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
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
