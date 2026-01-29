'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { PricingHistory } from './pricing-history'
import { ServiceSheetHistory } from '@/components/service-sheets/service-sheet-history'
import type { PricingSnapshot } from '@/lib/providers/pricing-actions'
import type { ServiceSheetSnapshot } from '@/lib/service-templates/actions'

interface PricingSelectionTabProps {
  providerId: string
  providerName: string
  hasFormsSubmitted: boolean
  snapshots?: PricingSnapshot[]
  serviceSheetSnapshots?: ServiceSheetSnapshot[]
}

export function PricingSelectionTab({
  providerId,
  providerName,
  hasFormsSubmitted,
  snapshots = [],
  serviceSheetSnapshots = [],
}: PricingSelectionTabProps) {
  // Show message if forms not submitted yet
  if (!hasFormsSubmitted) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Aguardando submissão do formulário de serviços</h3>
          <p className="text-sm text-muted-foreground">
            Os documentos estarão disponíveis após o prestador submeter o formulário de serviços.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Service Sheet Section + History */}
      <ServiceSheetHistory
        snapshots={serviceSheetSnapshots}
        providerId={providerId}
        providerName={providerName}
      />

      {/* Pricing History */}
      <PricingHistory snapshots={snapshots} providerName={providerName} />
    </div>
  )
}
