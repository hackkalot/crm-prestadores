'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { resumeFromOnHold, type ResumeFromOnHoldState } from '@/lib/candidaturas/actions'
import { AlertCircle, PlayCircle } from 'lucide-react'
import { useEffect } from 'react'

interface ResumeFromOnHoldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  providerName: string
}

const initialState: ResumeFromOnHoldState = {}

export function ResumeFromOnHoldDialog({
  open,
  onOpenChange,
  providerId,
  providerName
}: ResumeFromOnHoldDialogProps) {
  const [state, formAction, isPending] = useActionState(resumeFromOnHold, initialState)

  useEffect(() => {
    if (state.success) {
      onOpenChange(false)
    }
  }, [state.success, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <PlayCircle className="h-5 w-5" />
            Retomar Onboarding
          </DialogTitle>
          <DialogDescription>
            Tens a certeza que queres retomar o onboarding de <strong>{providerName}</strong>?
            O processo continuara de onde ficou pausado.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="providerId" value={providerId} />

          {state.error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {state.error}
            </div>
          )}

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
              {isPending ? 'A processar...' : 'Retomar Onboarding'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
