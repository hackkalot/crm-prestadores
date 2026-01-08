'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './kanban-card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  stage: {
    id: string
    stage_number: string
    name: string
  }
  cards: Array<{
    id: string
    onboarding_type: string
    started_at: string
    provider?: {
      id: string
      name: string
      entity_type: string
      email: string
      phone?: string | null
    }
    owner?: {
      id: string
      name: string
    }
    tasks?: Array<{
      id: string
      status: string
      deadline_at: string | null
      updated_at?: string | null
    }>
  }>
  alertConfig?: {
    hoursBeforeDeadline: number
    stalledDays: number
  }
}

// Color mapping for each stage
const stageColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  '1': { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  '2': { bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
  '3': { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  '4': { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' },
  '5': { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' },
  '6': { bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
}

export function KanbanColumn({ stage, cards, alertConfig }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stage,
    },
  })

  const colors = stageColors[stage.stage_number] || stageColors['1']

  return (
    <div className="flex flex-col h-full min-w-[300px] max-w-[300px]">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-t-lg border border-b-0",
        colors.bg,
        colors.border
      )}>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold", colors.text)}>
            {stage.stage_number}
          </span>
          <h3 className={cn("font-semibold text-sm", colors.text)}>{stage.name}</h3>
        </div>
        <Badge variant="secondary" className={cn("text-xs font-medium border-0", colors.badge)}>
          {cards.length}
        </Badge>
      </div>

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2 space-y-2 bg-muted/20 rounded-b-lg border overflow-y-auto',
          isOver && 'bg-primary/10 border-primary'
        )}
        style={{ minHeight: '200px' }}
      >
        <SortableContext
          items={cards.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map(card => (
            <KanbanCard
              key={card.id}
              card={card}
              alertConfig={alertConfig}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
            Sem cards
          </div>
        )}
      </div>
    </div>
  )
}
