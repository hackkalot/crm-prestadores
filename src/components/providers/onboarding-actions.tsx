'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RemoveFromOnboardingDialog } from '@/components/providers/remove-from-onboarding-dialog'
import { Undo2 } from 'lucide-react'

interface OnboardingActionsProps {
  providerId: string
  providerName: string
}

export function OnboardingActions({ providerId, providerName }: OnboardingActionsProps) {
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setRemoveDialogOpen(true)}>
        <Undo2 className="h-4 w-4 mr-2" />
        Remover do Onboarding
      </Button>

      <RemoveFromOnboardingDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        providerId={providerId}
        providerName={providerName}
      />
    </>
  )
}
