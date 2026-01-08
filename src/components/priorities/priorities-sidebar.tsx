'use client'

import { useState } from 'react'
import { Target, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PriorityCard } from './priority-card'
import type { Priority } from '@/types/priorities'

interface PrioritiesSidebarProps {
  priorities: Priority[]
}

export function PrioritiesSidebar({ priorities }: PrioritiesSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeCount = priorities.length

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
        aria-label="Prioridades"
      >
        <Target className="h-5 w-5" />
        {activeCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {activeCount > 9 ? '9+' : activeCount}
          </Badge>
        )}
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-background border-l z-50 shadow-xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-muted/50">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                <h2 className="font-semibold text-lg">
                  Prioridades ({activeCount})
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Priority List */}
            <div className="overflow-auto h-[calc(100%-73px)] p-4">
              {priorities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Target className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Não tem prioridades ativas atribuídas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {priorities.map((priority) => (
                    <PriorityCard
                      key={priority.id}
                      priority={priority}
                      onClose={() => setIsOpen(false)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
