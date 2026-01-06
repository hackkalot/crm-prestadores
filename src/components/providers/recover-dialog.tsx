'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { recoverCandidatura, type RecoverState } from '@/lib/candidaturas/actions'
import { AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface RecoverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
}

const initialState: RecoverState = {}

export function RecoverDialog({ open, onOpenChange, providerId }: RecoverDialogProps) {
  const [state, formAction, isPending] = useActionState(recoverCandidatura, initialState)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (state.success) {
      onOpenChange(false)
      setNotes('')
    }
  }, [state.success, onOpenChange])

  useEffect(() => {
    if (!open) {
      setNotes('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recuperar Candidatura</DialogTitle>
          <DialogDescription>
            Esta candidatura foi abandonada. Ao recuperar, voltará ao estado de nova candidatura.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="providerId" value={providerId} />
          <input type="hidden" name="notes" value={notes} />

          {state.error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Notas (opcional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo da recuperação..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'A processar...' : 'Recuperar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
