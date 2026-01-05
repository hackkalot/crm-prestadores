'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SendToOnboardingDialog } from './send-to-onboarding-dialog'
import { AbandonDialog } from './abandon-dialog'
import { Send, X } from 'lucide-react'

interface CandidaturaActionsProps {
  providerId: string
}

export function CandidaturaActions({ providerId }: CandidaturaActionsProps) {
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [abandonDialogOpen, setAbandonDialogOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2">
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
