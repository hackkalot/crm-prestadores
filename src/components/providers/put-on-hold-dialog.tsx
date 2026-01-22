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
import { putOnHold, type PutOnHoldState } from '@/lib/candidaturas/actions'
import { AlertCircle, PauseCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface PutOnHoldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  providerName: string
}

const initialState: PutOnHoldState = {}

export function PutOnHoldDialog({
  open,
  onOpenChange,
  providerId,
  providerName
}: PutOnHoldDialogProps) {
  const [state, formAction, isPending] = useActionState(putOnHold, initialState)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (state.success) {
      onOpenChange(false)
      setReason('')
    }
  }, [state.success, onOpenChange])

  useEffect(() => {
    if (!open) {
      setReason('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <PauseCircle className="h-5 w-5" />
            Colocar On-Hold
          </DialogTitle>
          <DialogDescription>
            Tens a certeza que queres colocar <strong>{providerName}</strong> em on-hold?
            O prestador sera removido do kanban de onboarding e o processo ficara pausado.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="providerId" value={providerId} />
          <input type="hidden" name="reason" value={reason} />

          {state.error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo (opcional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indica o motivo da pausa..."
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
            <Button type="submit" disabled={isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
              {isPending ? 'A processar...' : 'Colocar On-Hold'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
