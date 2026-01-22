'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ResumeFromOnHoldDialog } from '@/components/providers/resume-from-on-hold-dialog'
import { PlayCircle } from 'lucide-react'

interface OnHoldActionsProps {
  providerId: string
  providerName: string
}

export function OnHoldActions({ providerId, providerName }: OnHoldActionsProps) {
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false)

  return (
    <div className="flex gap-2">
      <Button variant="default" size="sm" onClick={() => setResumeDialogOpen(true)}>
        <PlayCircle className="h-4 w-4 mr-2" />
        Retomar Onboarding
      </Button>

      <ResumeFromOnHoldDialog
        open={resumeDialogOpen}
        onOpenChange={setResumeDialogOpen}
        providerId={providerId}
        providerName={providerName}
      />
    </div>
  )
}
