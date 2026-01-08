'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Calendar, TrendingUp } from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'
import { calculateProgressPercentage, getPriorityHealth } from '@/lib/priorities/utils'
import { buildPriorityFilterUrl } from '@/lib/priorities/utils'
import {
  PRIORITY_URGENCY_LABELS,
  PRIORITY_URGENCY_VARIANTS,
  type Priority,
} from '@/types/priorities'

interface PriorityCardProps {
  priority: Priority
  onClose: () => void
}

export function PriorityCard({ priority, onClose }: PriorityCardProps) {
  const router = useRouter()
  const progress = calculateProgressPercentage(
    priority.current_value,
    priority.target_value
  )
  const health = getPriorityHealth(priority)

  const handleClick = () => {
    const url = buildPriorityFilterUrl(priority)
    router.push(url)
    onClose()
  }

  // Health-based styling
  const healthColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  }

  const healthBgColors = {
    good: 'bg-green-100 dark:bg-green-900/30',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30',
    danger: 'bg-red-100 dark:bg-red-900/30',
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{
        borderLeftColor:
          health === 'good'
            ? 'rgb(22, 163, 74)'
            : health === 'warning'
              ? 'rgb(202, 138, 4)'
              : 'rgb(220, 38, 38)',
      }}
      onClick={handleClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Title and Urgency */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm line-clamp-2">
            {priority.title}
          </h3>
          <Badge
            variant={PRIORITY_URGENCY_VARIANTS[priority.urgency]}
            className="shrink-0"
          >
            {PRIORITY_URGENCY_LABELS[priority.urgency]}
          </Badge>
        </div>

        {/* Description */}
        {priority.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {priority.description}
          </p>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <TrendingUp className={cn('h-3.5 w-3.5', healthColors[health])} />
              <span className="font-medium">
                {priority.current_value} / {priority.target_value}{' '}
                {priority.unit || 'prestadores'}
              </span>
            </div>
            <span className={cn('font-semibold', healthColors[health])}>
              {progress}%
            </span>
          </div>
          <Progress
            value={progress}
            className={cn('h-2', healthBgColors[health])}
          />
        </div>

        {/* Deadline */}
        {priority.deadline && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Prazo: {formatDateTime(priority.deadline)}</span>
          </div>
        )}

        {/* Click hint */}
        <p className="text-xs text-muted-foreground italic">
          Clique para ver prestadores relacionados
        </p>
      </CardContent>
    </Card>
  )
}
