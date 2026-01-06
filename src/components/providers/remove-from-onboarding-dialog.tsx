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
import { removeFromOnboarding, type RemoveFromOnboardingState } from '@/lib/candidaturas/actions'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface RemoveFromOnboardingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  providerName: string
}

const initialState: RemoveFromOnboardingState = {}

export function RemoveFromOnboardingDialog({
  open,
  onOpenChange,
  providerId,
  providerName
}: RemoveFromOnboardingDialogProps) {
  const [state, formAction, isPending] = useActionState(removeFromOnboarding, initialState)
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
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Remover do Onboarding
          </DialogTitle>
          <DialogDescription>
            Tens a certeza que queres remover <strong>{providerName}</strong> do onboarding?
            Esta ação irá apagar todas as tarefas e progresso do onboarding.
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
              placeholder="Indica o motivo da remoção..."
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
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? 'A processar...' : 'Remover do Onboarding'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
