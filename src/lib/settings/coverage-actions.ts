'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface CoverageSettings {
  coverage_requests_per_provider: number
  coverage_capacity_good_min: number
  coverage_capacity_low_min: number
  coverage_analysis_period_months: number
}

export async function getCoverageSettings(): Promise<CoverageSettings> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      coverage_requests_per_provider: 20,
      coverage_capacity_good_min: 100,
      coverage_capacity_low_min: 50,
      coverage_analysis_period_months: 1,
    }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('settings')
    .select('coverage_requests_per_provider, coverage_capacity_good_min, coverage_capacity_low_min, coverage_analysis_period_months')
    .single()

  if (error || !data) {
    return {
      coverage_requests_per_provider: 20,
      coverage_capacity_good_min: 100,
      coverage_capacity_low_min: 50,
      coverage_analysis_period_months: 1,
    }
  }

  return {
    coverage_requests_per_provider: data.coverage_requests_per_provider || 20,
    coverage_capacity_good_min: data.coverage_capacity_good_min || 100,
    coverage_capacity_low_min: data.coverage_capacity_low_min || 50,
    coverage_analysis_period_months: data.coverage_analysis_period_months || 1,
  }
}

export async function updateCoverageSettings(
  _prevState: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Não autenticado' }
  }

  const requestsPerProvider = parseInt(formData.get('requests_per_provider') as string)
  const capacityGoodMin = parseInt(formData.get('capacity_good_min') as string)
  const capacityLowMin = parseInt(formData.get('capacity_low_min') as string)
  const periodMonths = parseInt(formData.get('period_months') as string)

  // Validações
  if (isNaN(requestsPerProvider) || requestsPerProvider < 1) {
    return { error: 'Pedidos por prestador deve ser >= 1' }
  }

  if (isNaN(capacityGoodMin) || capacityGoodMin < 0 || capacityGoodMin > 200) {
    return { error: 'Capacidade boa deve estar entre 0 e 200%' }
  }

  if (isNaN(capacityLowMin) || capacityLowMin < 0 || capacityLowMin > 200) {
    return { error: 'Capacidade baixa deve estar entre 0 e 200%' }
  }

  if (capacityGoodMin <= capacityLowMin) {
    return { error: 'Capacidade boa deve ser maior que capacidade baixa' }
  }

  if (isNaN(periodMonths) || periodMonths < 1 || periodMonths > 12) {
    return { error: 'Período deve estar entre 1 e 12 meses' }
  }

  const admin = createAdminClient()

  console.log('[Coverage Settings] Updating with values:', {
    coverage_requests_per_provider: requestsPerProvider,
    coverage_capacity_good_min: capacityGoodMin,
    coverage_capacity_low_min: capacityLowMin,
    coverage_analysis_period_months: periodMonths,
  })

  const { data, error } = await admin
    .from('settings')
    .update({
      coverage_requests_per_provider: requestsPerProvider,
      coverage_capacity_good_min: capacityGoodMin,
      coverage_capacity_low_min: capacityLowMin,
      coverage_analysis_period_months: periodMonths,
      updated_at: new Date().toISOString(),
    })
    .eq('id', '00000000-0000-0000-0000-000000000000')
    .select()

  if (error) {
    console.error('[Coverage Settings] Error updating:', error)
    return { error: `Erro ao guardar configurações: ${error.message}` }
  }

  console.log('[Coverage Settings] Update successful:', data)

  revalidatePath('/configuracoes')
  revalidatePath('/rede')

  return { success: true }
}
