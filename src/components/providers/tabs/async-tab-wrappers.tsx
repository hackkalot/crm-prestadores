import { getProviderApplicationHistory, getProviderOnboarding, getProviderNotes, getProviderHistory } from '@/lib/providers/actions'
import { getProviderPricingTable } from '@/lib/pricing/actions'
import { getProviderDocuments } from '@/lib/documents/actions'

import { PerfilTab } from './perfil-tab'
import { CandidaturaTab } from './candidatura-tab'
import { OnboardingTab } from './onboarding-tab'
import { PrecosTab } from './precos-tab'
import { NotasTab } from './notas-tab'
import { HistoricoTab } from './historico-tab'

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
