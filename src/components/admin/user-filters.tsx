'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface UserFiltersProps {
  counts: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos', countKey: 'total' as const },
  { value: 'pending', label: 'Pendentes', countKey: 'pending' as const },
  { value: 'approved', label: 'Aprovados', countKey: 'approved' as const },
  { value: 'rejected', label: 'Rejeitados', countKey: 'rejected' as const },
]

export function UserFilters({ counts }: UserFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentStatus = searchParams.get('status') || ''

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status) {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    router.push(`/admin/utilizadores?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => handleStatusChange(option.value)}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            currentStatus === option.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
          )}
        >
          {option.label}
          <Badge
            variant={currentStatus === option.value ? 'secondary' : 'outline'}
            className={cn(
              'ml-1 min-w-[1.5rem] justify-center',
              option.value === 'pending' && counts.pending > 0 && currentStatus !== option.value
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : ''
            )}
          >
            {counts[option.countKey]}
          </Badge>
        </button>
      ))}
    </div>
  )
}
