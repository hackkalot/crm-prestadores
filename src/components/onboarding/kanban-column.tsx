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

export function KanbanColumn({ stage, cards, alertConfig }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stage,
    },
  })

  return (
    <div className="flex flex-col h-full min-w-[300px] max-w-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-t-lg border border-b-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {stage.stage_number}
          </span>
          <h3 className="font-medium text-sm">{stage.name}</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
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
