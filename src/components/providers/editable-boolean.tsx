'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

interface EditableBooleanProps {
  value: boolean | null | undefined
  onSave: (value: boolean) => Promise<{ error?: string }>
  label: string
}

export function EditableBoolean({ value, onSave, label }: EditableBooleanProps) {
  const [isPending, startTransition] = useTransition()

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      await onSave(checked)
    })
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Switch
          checked={value || false}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      </div>
    </div>
  )
}
