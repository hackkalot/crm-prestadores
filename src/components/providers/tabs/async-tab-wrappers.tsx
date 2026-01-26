import { getProviderApplicationHistory, getProviderOnboarding, getProviderHistory } from '@/lib/providers/actions'
import { getProviderPricingOptions, getPricingSnapshots } from '@/lib/providers/pricing-actions'
import { getProviderDocuments } from '@/lib/documents/actions'
import { getProviderNotesWithFiles, getProviderInProgressTasks } from '@/lib/notes/actions'
import {
  getProviderServiceRequests,
  getDistinctCategories,
  getDistinctDistricts,
  getDistinctStatuses,
} from '@/lib/service-requests/actions'
import { getProviderPerformance, getNetworkBenchmark } from '@/lib/providers/performance-actions'
import { createClient } from '@/lib/supabase/server'

import { SubmissoesTab } from './submissoes-tab'
import { PerfilTab } from './perfil-tab'
import { OnboardingTab } from './onboarding-tab'
import { PricingSelectionTab } from '@/components/providers/pricing-selection-tab'
import { ChatNotesTab } from './chat-notes-tab'
import { HistoricoTab } from './historico-tab'
import { PedidosTab } from './pedidos-tab'
import { PerformanceTab } from './performance-tab'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, BarChart3 } from 'lucide-react'

// Async wrapper for Submissoes tab
export async function SubmissoesTabAsync({
  providerId,
  provider,
}: {
  providerId: string
  provider: any
}) {
  const applicationHistory = await getProviderApplicationHistory(providerId)

  // Fetch ALL forms submissions (historical snapshots)
  let submissions: any[] = []
  let allServicesMap: Map<string, any> = new Map()

  if (provider.forms_submitted_at) {
    const { getAllProviderFormsSubmissions } = await import('@/lib/forms/services-actions')
    const result = await getAllProviderFormsSubmissions(providerId)
    submissions = result.success && result.submissions ? result.submissions : []

    // Collect all unique service IDs across all submissions
    const allServiceIds = new Set<string>()
    submissions.forEach(sub => {
      sub.selected_services?.forEach((id: string) => allServiceIds.add(id))
    })

    // Fetch service details for all services referenced in any submission
    if (allServiceIds.size > 0) {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminClient = createAdminClient()

      const { data: servicesData } = await adminClient
        .from('service_prices')
        .select('id, service_name, cluster, service_group, unit_description, typology')
        .in('id', Array.from(allServiceIds))
        .order('cluster')
        .order('service_group')
        .order('service_name')

      if (servicesData) {
        servicesData.forEach(service => {
          allServicesMap.set(service.id, service)
        })
      }
    }
  }

  return (
    <SubmissoesTab
      provider={provider}
      applicationHistory={applicationHistory}
      submissions={submissions}
      allServicesMap={Object.fromEntries(allServicesMap)}
    />
  )
}

// Async wrapper for Perfil tab
export async function PerfilTabAsync({
  provider,
}: {
  provider: any
}) {
  // All forms data is now stored directly in providers table
  // We only need to fetch services data for display and editing
  let selectedServicesDetails = null
  let allServicesData = null

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  // Fetch ALL services for the edit dialog
  const { data: allServices } = await adminClient
    .from('service_prices')
    .select('id, service_name, cluster, service_group, unit_description, typology')
    .eq('is_active', true)
    .order('cluster')
    .order('service_group')
    .order('service_name')

  if (allServices) {
    // Group all services by cluster and service_group
    allServicesData = allServices.reduce((acc: any, service: any) => {
      if (!acc[service.cluster]) {
        acc[service.cluster] = {}
      }
      const group = service.service_group || 'Outros'
      if (!acc[service.cluster][group]) {
        acc[service.cluster][group] = []
      }
      acc[service.cluster][group].push(service)
      return acc
    }, {})
  }

  // Fetch service details for the selected services (from provider.services)
  if (provider.services && provider.services.length > 0) {
    const { data: servicesData } = await adminClient
      .from('service_prices')
      .select('id, service_name, cluster, service_group, unit_description, typology')
      .in('id', provider.services)
      .order('cluster')
      .order('service_group')
      .order('service_name')

    if (servicesData) {
      // Group services by cluster and service_group
      selectedServicesDetails = servicesData.reduce((acc: any, service: any) => {
        if (!acc[service.cluster]) {
          acc[service.cluster] = {}
        }
        const group = service.service_group || 'Outros'
        if (!acc[service.cluster][group]) {
          acc[service.cluster][group] = []
        }
        acc[service.cluster][group].push(service)
        return acc
      }, {})
    }
  }

  return (
    <PerfilTab
      provider={provider}
      selectedServicesDetails={selectedServicesDetails}
      allServicesData={allServicesData}
    />
  )
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

  // Check if we're on stage 2 (need pricing data for task #4)
  // stage_number is a string in the database
  const currentStageNumber = onboardingCard.current_stage?.stage_number
  let pricingData = null

  if (currentStageNumber === '2' && provider.forms_submitted_at) {
    // Load pricing data for task #4
    const clusters = await getProviderPricingOptions(providerId)
    pricingData = {
      clusters,
      providerServices: provider.services || [],
    }
  }

  return (
    <OnboardingTab
      provider={provider}
      onboardingCard={onboardingCard}
      users={loadedUsers}
      pricingData={pricingData}
    />
  )
}

// Async wrapper for Preços tab (now shows only proposal history)
export async function PrecosTabAsync({
  providerId,
  provider,
}: {
  providerId: string
  provider: any
}) {
  // Only load snapshots - pricing selection is now in the onboarding task
  const snapshots = await getPricingSnapshots(providerId)

  return (
    <PricingSelectionTab
      providerId={providerId}
      providerName={provider.name}
      hasFormsSubmitted={!!provider.forms_submitted_at}
      snapshots={snapshots}
    />
  )
}

// Async wrapper for Notas tab (Chat-style with rich text and attachments)
export async function NotasTabAsync({
  providerId,
}: {
  providerId: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [notes, inProgressTasks, documents] = await Promise.all([
    getProviderNotesWithFiles(providerId),
    getProviderInProgressTasks(providerId),
    getProviderDocuments(providerId),
  ])

  return (
    <ChatNotesTab
      providerId={providerId}
      notes={notes}
      currentUserId={user?.id || ''}
      inProgressTasks={inProgressTasks}
      documents={documents}
    />
  )
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
