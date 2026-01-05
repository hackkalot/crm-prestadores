'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { abandonCandidatura, type AbandonState } from '@/lib/candidaturas/actions'
import { AlertCircle, UserX, Building } from 'lucide-react'
import { useEffect, useState } from 'react'

interface AbandonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string | null
}

const initialState: AbandonState = {}

const reasonsByParty = {
  prestador: [
    'Nao aceita preco',
    'Nao e oportuno',
    'Outro',
  ],
  fixo: [
    'Parceiro nao responde',
    'Nao se enquadra no perfil',
    'Nao tem IBAN PT',
    'Nao tem atividade aberta',
    'Outro',
  ],
}

export function AbandonDialog({ open, onOpenChange, providerId }: AbandonDialogProps) {
  const [state, formAction, isPending] = useActionState(abandonCandidatura, initialState)
  const [party, setParty] = useState<'prestador' | 'fixo' | null>(null)
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (state.success) {
      onOpenChange(false)
      setParty(null)
      setReason('')
      setNotes('')
    }
  }, [state.success, onOpenChange])

  useEffect(() => {
    if (!open) {
      setParty(null)
      setReason('')
      setNotes('')
    }
  }, [open])

  if (!providerId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Abandonar Candidatura</DialogTitle>
          <DialogDescription>
            Indica quem nao quer avancar e o motivo
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="p-6 space-y-4">
          <input type="hidden" name="providerId" value={providerId} />
          <input type="hidden" name="party" value={party || ''} />
          <input type="hidden" name="reason" value={reason} />
          <input type="hidden" name="notes" value={notes} />

          {state.error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {state.error}
            </div>
          )}

          {/* Step 1: Quem nao quer avancar */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quem nao quer avancar?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setParty('prestador'); setReason(''); }}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  party === 'prestador'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <UserX className="h-5 w-5 mb-1 text-muted-foreground" />
                <span className="text-sm font-medium">Parceiro</span>
              </button>

              <button
                type="button"
                onClick={() => { setParty('fixo'); setReason(''); }}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  party === 'fixo'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <Building className="h-5 w-5 mb-1 text-muted-foreground" />
                <span className="text-sm font-medium">FIXO</span>
              </button>
            </div>
          </div>

          {/* Step 2: Motivo */}
          {party && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo</label>
              <div className="space-y-2">
                {reasonsByParty[party].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`w-full p-2 rounded-lg border text-left text-sm transition-colors ${
                      reason === r
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Notas adicionais (se "Outro") */}
          {reason === 'Outro' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas adicionais</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Descreve o motivo..."
              />
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
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending || !party || !reason}
            >
              {isPending ? 'A processar...' : 'Confirmar Abandono'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
