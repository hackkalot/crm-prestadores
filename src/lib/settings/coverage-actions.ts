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
    .select('value')
    .eq('key', 'coverage_thresholds')
    .single()

  if (error || !data?.value) {
    return {
      coverage_requests_per_provider: 20,
      coverage_capacity_good_min: 100,
      coverage_capacity_low_min: 50,
      coverage_analysis_period_months: 1,
    }
  }

  const value = data.value as Record<string, number>

  return {
    coverage_requests_per_provider: value.requests_per_provider || 20,
    coverage_capacity_good_min: value.capacity_good_min || 100,
    coverage_capacity_low_min: value.capacity_low_min || 50,
    coverage_analysis_period_months: value.analysis_period_months || 1,
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

  const newValue = {
    requests_per_provider: requestsPerProvider,
    capacity_good_min: capacityGoodMin,
    capacity_low_min: capacityLowMin,
    analysis_period_months: periodMonths,
  }

  console.log('[Coverage Settings] Updating with values:', newValue)

  const { data, error } = await admin
    .from('settings')
    .update({
      value: newValue,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('key', 'coverage_thresholds')
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
