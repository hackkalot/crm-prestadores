'use client'

import { useState, useTransition } from 'react'
import { useFormState } from 'react-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Minus, Loader2, AlertCircle, TrendingUp } from 'lucide-react'
import { updatePriorityProgress } from '@/lib/priorities/actions'
import type { Priority } from '@/types/priorities'

interface UpdateProgressDialogProps {
  priority: Priority
}

export function UpdateProgressDialog({ priority }: UpdateProgressDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [newValue, setNewValue] = useState(priority.current_value)

  const [state, formAction] = useFormState(updatePriorityProgress, null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      await formAction(formData)
    })
  }

  // Close dialog on success
  if (state?.success && open) {
    setOpen(false)
  }

  const handleIncrement = () => {
    if (newValue < priority.target_value) {
      setNewValue(newValue + 1)
    }
  }

  const handleDecrement = () => {
    if (newValue > 0) {
      setNewValue(newValue - 1)
    }
  }

  const progress = Math.round((newValue / priority.target_value) * 100)
  const isCompleted = newValue >= priority.target_value

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TrendingUp className="h-4 w-4 mr-2" />
          Atualizar Progresso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Atualizar Progresso</DialogTitle>
            <DialogDescription>{priority.title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {state?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {/* Hidden fields */}
            <input type="hidden" name="priority_id" value={priority.id} />
            <input type="hidden" name="new_value" value={newValue} />

            {/* Current Progress */}
            <div className="space-y-2">
              <Label>Progresso Atual</Label>
              <div className="text-sm text-muted-foreground">
                {priority.current_value} / {priority.target_value}{' '}
                {priority.unit}
              </div>
            </div>

            {/* New Value Input */}
            <div className="space-y-2">
              <Label htmlFor="new_value_display">Novo Valor</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleDecrement}
                  disabled={isPending || newValue <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="new_value_display"
                  type="number"
                  min="0"
                  max={priority.target_value}
                  value={newValue}
                  onChange={(e) => setNewValue(parseInt(e.target.value) || 0)}
                  disabled={isPending}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleIncrement}
                  disabled={isPending || newValue >= priority.target_value}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progress}% completo</span>
                {isCompleted && (
                  <span className="text-green-600 font-medium">
                    ✓ Meta atingida!
                  </span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isCompleted ? 'bg-green-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            {/* Note (optional) */}
            <div className="space-y-2">
              <Label htmlFor="note">Nota (opcional)</Label>
              <Textarea
                id="note"
                name="note"
                placeholder="Adicione uma nota sobre esta atualização..."
                rows={3}
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
