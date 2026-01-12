import { getProviderApplicationHistory, getProviderOnboarding, getProviderNotes, getProviderHistory } from '@/lib/providers/actions'
import { getProviderPricingTable } from '@/lib/pricing/actions'
import { getProviderDocuments } from '@/lib/documents/actions'
import {
  getProviderServiceRequests,
  getDistinctCategories,
  getDistinctDistricts,
  getDistinctStatuses,
} from '@/lib/service-requests/actions'
import { getProviderPerformance, getNetworkBenchmark } from '@/lib/providers/performance-actions'

import { CandidaturaTab } from './candidatura-tab'
import { OnboardingTab } from './onboarding-tab'
import { PrecosTab } from './precos-tab'
import { NotasTab } from './notas-tab'
import { HistoricoTab } from './historico-tab'
import { PedidosTab } from './pedidos-tab'
import { PerformanceTab } from './performance-tab'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, BarChart3 } from 'lucide-react'

// Async wrapper for Candidatura tab
export async function CandidaturaTabAsync({
  providerId,
  provider,
}: {
  providerId: string
  provider: any
}) {
  const applicationHistory = await getProviderApplicationHistory(providerId)
  return <CandidaturaTab provider={provider} applicationHistory={applicationHistory} />
}

// Async wrapper for Onboarding tab
export async function OnboardingTabAsync({
  providerId,
  provider,
  users,
}: {
  providerId: string
  provider: any
  users?: any[] | null
}) {
  const [onboardingCard, loadedUsers] = await Promise.all([
    getProviderOnboarding(providerId),
    users ? Promise.resolve(users) : import('@/lib/providers/actions').then(m => m.getUsers()),
  ])

  if (!onboardingCard) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        O onboarding ainda não foi iniciado.
      </div>
    )
  }

  return <OnboardingTab provider={provider} onboardingCard={onboardingCard} users={loadedUsers} />
}

// Async wrapper for Preços tab
export async function PrecosTabAsync({
  providerId,
  provider,
}: {
  providerId: string
  provider: any
}) {
  const pricingTable = await getProviderPricingTable(providerId)
  return <PrecosTab provider={provider} pricingTable={pricingTable} />
}

// Async wrapper for Notas tab
export async function NotasTabAsync({
  providerId,
}: {
  providerId: string
}) {
  const [notes, documents] = await Promise.all([
    getProviderNotes(providerId),
    getProviderDocuments(providerId),
  ])

  return <NotasTab providerId={providerId} notes={notes} documents={documents} />
}

// Async wrapper for Historico tab
export async function HistoricoTabAsync({
  providerId,
}: {
  providerId: string
}) {
  const history = await getProviderHistory(providerId)
  return <HistoricoTab history={history} />
}

// Async wrapper for Pedidos tab
export async function PedidosTabAsync({
  provider,
}: {
  provider: { id: string; backoffice_provider_id: number | null; name: string }
}) {
  // If no backoffice_provider_id, show empty state
  if (!provider.backoffice_provider_id) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Prestador sem ID de backoffice</p>
          <p className="text-sm text-muted-foreground mt-1">
            Este prestador nao esta ligado ao backoffice FIXO
          </p>
        </CardContent>
      </Card>
    )
  }

  const [initialData, categories, districts, statuses] = await Promise.all([
    getProviderServiceRequests(provider.backoffice_provider_id, { page: 1, limit: 25 }),
    getDistinctCategories(),
    getDistinctDistricts(),
    getDistinctStatuses(),
  ])

  return (
    <PedidosTab
      backofficeProviderId={provider.backoffice_provider_id}
      initialData={initialData}
      categories={categories}
      districts={districts}
      statuses={statuses}
    />
  )
}

// Async wrapper for Performance tab
export async function PerformanceTabAsync({
  provider,
}: {
  provider: { id: string; backoffice_provider_id: number | null; name: string }
}) {
  // If no backoffice_provider_id, show empty state
  if (!provider.backoffice_provider_id) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Prestador sem ID de backoffice</p>
          <p className="text-sm text-muted-foreground mt-1">
            Este prestador nao esta ligado ao backoffice FIXO
          </p>
        </CardContent>
      </Card>
    )
  }

  const [initialPerformance, initialBenchmark] = await Promise.all([
    getProviderPerformance(provider.backoffice_provider_id),
    getNetworkBenchmark(),
  ])

  return (
    <PerformanceTab
      backofficeProviderId={provider.backoffice_provider_id}
      initialPerformance={initialPerformance}
      initialBenchmark={initialBenchmark}
    />
  )
}
