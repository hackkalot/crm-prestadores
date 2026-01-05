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
import { sendToOnboarding, type SendToOnboardingState } from '@/lib/candidaturas/actions'
import { AlertCircle, Zap, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SendToOnboardingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string | null
}

const initialState: SendToOnboardingState = {}

export function SendToOnboardingDialog({ open, onOpenChange, providerId }: SendToOnboardingDialogProps) {
  const [state, formAction, isPending] = useActionState(sendToOnboarding, initialState)
  const [selectedType, setSelectedType] = useState<'normal' | 'urgente'>('normal')

  useEffect(() => {
    if (state.success) {
      onOpenChange(false)
    }
  }, [state.success, onOpenChange])

  if (!providerId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar para Onboarding</DialogTitle>
          <DialogDescription>
            Escolhe o tipo de onboarding para este prestador
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="p-6 space-y-4">
          <input type="hidden" name="providerId" value={providerId} />
          <input type="hidden" name="onboardingType" value={selectedType} />

          {state.error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {state.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedType('normal')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedType === 'normal'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <Clock className="h-6 w-6 mb-2 text-muted-foreground" />
              <h4 className="font-medium">Normal</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Prazos standard para cada tarefa
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('urgente')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedType === 'urgente'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <Zap className="h-6 w-6 mb-2 text-orange-500" />
              <h4 className="font-medium">Urgente</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Prazos reduzidos, prioridade alta
              </p>
            </button>
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
              {isPending ? 'A enviar...' : 'Enviar para Onboarding'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
