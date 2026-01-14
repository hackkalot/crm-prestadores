'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface CoverageSettings {
  coverage_good_min_providers: number
  coverage_low_min_providers: number
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
      coverage_good_min_providers: 3,
      coverage_low_min_providers: 1,
      coverage_analysis_period_months: 1,
    }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('settings')
    .select('coverage_good_min_providers, coverage_low_min_providers, coverage_analysis_period_months')
    .single()

  if (error || !data) {
    return {
      coverage_good_min_providers: 3,
      coverage_low_min_providers: 1,
      coverage_analysis_period_months: 1,
    }
  }

  return {
    coverage_good_min_providers: data.coverage_good_min_providers || 3,
    coverage_low_min_providers: data.coverage_low_min_providers || 1,
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

  const goodMin = parseInt(formData.get('good_min') as string)
  const lowMin = parseInt(formData.get('low_min') as string)
  const periodMonths = parseInt(formData.get('period_months') as string)

  // Validações
  if (isNaN(goodMin) || goodMin < 1) {
    return { error: 'Boa cobertura deve ser >= 1' }
  }

  if (isNaN(lowMin) || lowMin < 0) {
    return { error: 'Baixa cobertura deve ser >= 0' }
  }

  if (goodMin <= lowMin) {
    return { error: 'Boa cobertura deve ser maior que baixa cobertura' }
  }

  if (isNaN(periodMonths) || periodMonths < 1 || periodMonths > 12) {
    return { error: 'Período deve estar entre 1 e 12 meses' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('settings')
    .update({
      coverage_good_min_providers: goodMin,
      coverage_low_min_providers: lowMin,
      coverage_analysis_period_months: periodMonths,
      updated_at: new Date().toISOString(),
    })
    .eq('id', '00000000-0000-0000-0000-000000000000') // ID fixo da única row de settings

  if (error) {
    console.error('Error updating coverage settings:', error)
    return { error: 'Erro ao guardar configurações' }
  }

  revalidatePath('/configuracoes')
  revalidatePath('/rede')

  return { success: true }
}
