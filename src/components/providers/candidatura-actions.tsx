'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SendToOnboardingDialog } from '@/components/candidaturas/send-to-onboarding-dialog'
import { AbandonDialog } from '@/components/candidaturas/abandon-dialog'
import { RecoverDialog } from '@/components/providers/recover-dialog'
import { Send, X, RotateCcw } from 'lucide-react'

interface CandidaturaActionsProps {
  providerId: string
  status: string
}

export function CandidaturaActions({ providerId, status }: CandidaturaActionsProps) {
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [abandonDialogOpen, setAbandonDialogOpen] = useState(false)
  const [recoverDialogOpen, setRecoverDialogOpen] = useState(false)

  if (status === 'novo') {
    return (
      <>
        <div className="flex gap-2">
          <Button onClick={() => setSendDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Enviar para Onboarding
          </Button>
          <Button variant="outline" onClick={() => setAbandonDialogOpen(true)}>
            <X className="h-4 w-4 mr-2" />
            Abandonar
          </Button>
        </div>

        <SendToOnboardingDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          providerId={providerId}
        />

        <AbandonDialog
          open={abandonDialogOpen}
          onOpenChange={setAbandonDialogOpen}
          providerId={providerId}
        />
      </>
    )
  }

  if (status === 'abandonado') {
    return (
      <>
        <Button variant="outline" onClick={() => setRecoverDialogOpen(true)}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Recuperar Candidatura
        </Button>

        <RecoverDialog
          open={recoverDialogOpen}
          onOpenChange={setRecoverDialogOpen}
          providerId={providerId}
        />
      </>
    )
  }

  return null
}
