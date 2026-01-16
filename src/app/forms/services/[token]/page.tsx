import { getProviderByToken, getServicesForForms } from '@/lib/forms/services-actions'
import { ServicesFormClient } from './services-form-client'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

type Params = Promise<{ token: string }>

export default async function ServicesFormPage({
  params,
}: {
  params: Params
}) {
  const { token } = await params

  // Validate token and fetch provider
  const providerResult = await getProviderByToken(token)

  if (!providerResult.success || !providerResult.provider) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="max-w-md w-full p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Link Inválido</h1>
              <p className="text-muted-foreground">
                {providerResult.error || 'O link que usou é inválido ou expirou.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Fetch services
  const servicesResult = await getServicesForForms()

  if (!servicesResult.success || !servicesResult.services) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="max-w-md w-full p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Erro ao Carregar</h1>
              <p className="text-muted-foreground">
                {servicesResult.error || 'Não foi possível carregar os serviços disponíveis.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <ServicesFormClient
      token={token}
      provider={providerResult.provider}
      services={servicesResult.services}
    />
  )
}
