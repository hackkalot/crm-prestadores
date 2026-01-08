'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { moveCardToStage } from '@/lib/onboarding/actions'
import { toast } from 'sonner'

interface Stage {
  id: string
  stage_number: string
  name: string
  display_order: number
}

interface OnboardingCard {
  id: string
  current_stage_id: string
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
    task_definition?: {
      name: string
      task_number: number
    }
  }>
}

interface KanbanBoardProps {
  stages: Stage[]
  cards: OnboardingCard[]
  alertConfig?: {
    hoursBeforeDeadline: number
    stalledDays: number
  }
}

export function KanbanBoard({ stages, cards: initialCards, alertConfig }: KanbanBoardProps) {
  const [cards, setCards] = useState(initialCards)
  const [activeCard, setActiveCard] = useState<OnboardingCard | null>(null)
  const [mounted, setMounted] = useState(false)

  // Sync cards when initialCards changes (e.g., from filters)
  useEffect(() => {
    setCards(initialCards)
  }, [initialCards])

  // Prevent hydration mismatch with dnd-kit
  useEffect(() => {
    setMounted(true)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const card = cards.find(c => c.id === active.id)
    if (card) {
      setActiveCard(card)
    }
  }, [cards])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeCard = cards.find(c => c.id === active.id)
    if (!activeCard) return

    // Determinar novo stage
    let newStageId: string | null = null

    // Se soltar numa coluna
    if (over.data.current?.type === 'column') {
      newStageId = over.id as string
    }
    // Se soltar num card, mover para a mesma coluna
    else if (over.data.current?.type === 'card') {
      const overCard = cards.find(c => c.id === over.id)
      if (overCard) {
        newStageId = overCard.current_stage_id
      }
    }

    if (!newStageId || newStageId === activeCard.current_stage_id) return

    // Atualizar estado local imediatamente (otimistic update)
    setCards(prev =>
      prev.map(c =>
        c.id === activeCard.id
          ? { ...c, current_stage_id: newStageId! }
          : c
      )
    )

    // Persistir no servidor
    const formData = new FormData()
    formData.append('cardId', activeCard.id)
    formData.append('stageId', newStageId)

    const result = await moveCardToStage({}, formData)

    if (result.error) {
      // Reverter em caso de erro
      setCards(prev =>
        prev.map(c =>
          c.id === activeCard.id
            ? { ...c, current_stage_id: activeCard.current_stage_id }
            : c
        )
      )
      toast.error('Erro ao mover card. Tente novamente.')
    }
  }, [cards])


  // Agrupar cards por stage
  const cardsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = cards.filter(c => c.current_stage_id === stage.id)
    return acc
  }, {} as Record<string, OnboardingCard[]>)

  // Show loading skeleton before client-side mount to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {stages.map(stage => (
          <div
            key={stage.id}
            className="flex-shrink-0 w-[300px] rounded-xl bg-muted/50 p-2"
          >
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stage.stage_number}</span>
                <span className="font-medium">{stage.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {cardsByStage[stage.id]?.length || 0}
              </span>
            </div>
            <div className="flex-1 p-2 space-y-2 min-h-[200px]">
              {(cardsByStage[stage.id] || []).map(card => (
                <div
                  key={card.id}
                  className="rounded-xl border bg-card p-3 shadow-sm animate-pulse"
                >
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {stages.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              cards={cardsByStage[stage.id] || []}
              alertConfig={alertConfig}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="w-[284px]">
              <KanbanCard card={activeCard} alertConfig={alertConfig} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  )
}
