'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, X, Pencil, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditableNumberProps {
  value: number | null | undefined
  onSave: (value: number | null) => Promise<{ error?: string }>
  placeholder?: string
  icon?: React.ReactNode
  min?: number
  max?: number
  className?: string
}

export function EditableNumber({
  value,
  onSave,
  placeholder = 'Não definido',
  icon,
  min,
  max,
  className,
}: EditableNumberProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value?.toString() || '')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    const numValue = editValue ? parseInt(editValue, 10) : null

    if (numValue === value) {
      setIsEditing(false)
      return
    }

    startTransition(async () => {
      const result = await onSave(numValue)

      if (result.error) {
        setEditValue(value?.toString() || '')
        setIsEditing(false)
        return
      }

      setIsEditing(false)
    })
  }

  const handleCancel = () => {
    setEditValue(value?.toString() || '')
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isPending}
          min={min}
          max={max}
          autoFocus
          className="h-8"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isPending}
          className="h-8 w-8 p-0"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4 text-green-600" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isPending}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2 group", className)}>
      {icon && <span className="shrink-0">{icon}</span>}
      {value !== null && value !== undefined ? (
        <p className="font-medium">{value}</p>
      ) : (
        <p className="text-muted-foreground">{placeholder}</p>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
