'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, X, Pencil, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditableArrayProps {
  value: string[] | null | undefined
  onSave: (value: string[]) => Promise<{ error?: string }>
  placeholder?: string
  icon?: React.ReactNode
  className?: string
  suggestions?: string[]
}

export function EditableArray({
  value,
  onSave,
  placeholder = 'Nenhum item',
  icon,
  className,
  suggestions = [],
}: EditableArrayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<string[]>(value || [])
  const [newItem, setNewItem] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    if (JSON.stringify(editValue) === JSON.stringify(value)) {
      setIsEditing(false)
      return
    }

    startTransition(async () => {
      const result = await onSave(editValue)

      if (result.error) {
        setEditValue(value || [])
        setIsEditing(false)
        return
      }

      setIsEditing(false)
    })
  }

  const handleCancel = () => {
    setEditValue(value || [])
    setNewItem('')
    setIsEditing(false)
  }

  const handleAddItem = () => {
    const trimmed = newItem.trim()
    if (trimmed && !editValue.includes(trimmed)) {
      setEditValue([...editValue, trimmed])
      setNewItem('')
    }
  }

  const handleRemoveItem = (item: string) => {
    setEditValue(editValue.filter(i => i !== item))
  }

  const handleAddSuggestion = (suggestion: string) => {
    if (!editValue.includes(suggestion)) {
      setEditValue([...editValue, suggestion])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItem()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const availableSuggestions = suggestions.filter(s => !editValue.includes(s))

  if (isEditing) {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Current items */}
        <div className="flex flex-wrap gap-2">
          {editValue.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 pr-1">
              {item}
              <button
                type="button"
                onClick={() => handleRemoveItem(item)}
                disabled={isPending}
                className="ml-1 rounded-sm hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        {/* Add new item */}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Adicionar item..."
            disabled={isPending}
            className="h-8 flex-1"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddItem}
            disabled={isPending || !newItem.trim()}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggestions */}
        {availableSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground mr-1">Sugestões:</span>
            {availableSuggestions.slice(0, 10).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleAddSuggestion(suggestion)}
                disabled={isPending}
                className="text-xs px-2 py-0.5 rounded-md bg-muted hover:bg-muted/70 transition-colors"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isPending}
            className="h-8 gap-1"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 text-green-600" />
            )}
            Guardar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isPending}
            className="h-8 gap-1"
          >
            <X className="h-4 w-4 text-red-600" />
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("group", className)}>
      <div className="flex items-start gap-2">
        {icon && <span className="shrink-0 mt-1">{icon}</span>}
        <div className="flex-1 min-w-0">
          {value && value.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {value.map((item) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{placeholder}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
