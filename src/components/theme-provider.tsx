'use client'

import * as React from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(
  undefined
)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'fixo-crm-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(defaultTheme)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(storageKey) as Theme | null
    if (stored) {
      setTheme(stored)
    }
  }, [storageKey])

  React.useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme, mounted])

  const value = React.useMemo(
    () => ({
      theme,
      setTheme: (theme: Theme) => {
        localStorage.setItem(storageKey, theme)
        setTheme(theme)
      },
    }),
    [theme, storageKey]
  )

  // Prevent flash of unstyled content
  if (!mounted) {
    return (
      <ThemeProviderContext.Provider value={value} {...props}>
        {children}
      </ThemeProviderContext.Provider>
    )
  }

  return (
    <ThemeProviderContext.Provider value={value} {...props}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
