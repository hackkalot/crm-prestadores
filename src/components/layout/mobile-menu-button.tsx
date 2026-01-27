'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMobileSidebar } from './mobile-sidebar-context'

export function MobileMenuButton() {
  const { open } = useMobileSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={open}
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
