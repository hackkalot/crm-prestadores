'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Euro } from 'lucide-react'
import { PricingTable } from '@/components/prestadores/pricing-table'

interface ServiceCategory {
  id: string
  name: string
  cluster: string | null
  vat_rate: number
  is_active: boolean
}

interface ReferencePrice {
  id: string
  service_id: string
  variant_name: string | null
  variant_description: string | null
  price_without_vat: number
  valid_from: string
  is_active: boolean
}

interface ProviderPrice {
  id: string
  provider_id: string
  service_id: string
  variant_name: string | null
  price_without_vat: number
  valid_from: string
  is_active: boolean
}

interface ServiceWithPrices {
  id: string
  name: string
  description: string | null
  unit: string | null
  is_active: boolean
  category: ServiceCategory
  reference_prices: ReferencePrice[]
  provider_prices: ProviderPrice[]
}

interface PrecosTabProps {
  provider: {
    id: string
    name: string
    status: string
  }
  pricingTable: Array<{
    category: ServiceCategory
    services: ServiceWithPrices[]
  }> | null
}

export function PrecosTab({ provider, pricingTable }: PrecosTabProps) {
  if (!pricingTable || pricingTable.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Euro className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Tabela de preços não disponível.</p>
          <p className="text-sm">Os preços serão configurados após ativação do prestador.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <PricingTable
      providerId={provider.id}
      providerName={provider.name}
      data={pricingTable}
      deviationThreshold={0.15}
    />
  )
}
