'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RemoveFromOnboardingDialog } from '@/components/providers/remove-from-onboarding-dialog'
import { PutOnHoldDialog } from '@/components/providers/put-on-hold-dialog'
import { Undo2, PauseCircle } from 'lucide-react'

interface OnboardingActionsProps {
  providerId: string
  providerName: string
}

export function OnboardingActions({ providerId, providerName }: OnboardingActionsProps) {
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [onHoldDialogOpen, setOnHoldDialogOpen] = useState(false)

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setOnHoldDialogOpen(true)}>
        <PauseCircle className="h-4 w-4 mr-2" />
        On-Hold
      </Button>

      <Button variant="outline" size="sm" onClick={() => setRemoveDialogOpen(true)}>
        <Undo2 className="h-4 w-4 mr-2" />
        Remover do Onboarding
      </Button>

      <PutOnHoldDialog
        open={onHoldDialogOpen}
        onOpenChange={setOnHoldDialogOpen}
        providerId={providerId}
        providerName={providerName}
      />

      <RemoveFromOnboardingDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        providerId={providerId}
        providerName={providerName}
      />
    </div>
  )
}
