import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProviders() {
  console.log('🔍 A verificar prestadores na base de dados...\n')

  // Count all providers
  const { count: total } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Total de prestadores: ${total}`)

  // Count by status
  const statuses = ['novo', 'em_onboarding', 'ativo', 'suspenso', 'abandonado']

  for (const status of statuses) {
    const { count } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true })
      .eq('status', status)

    console.log(`   - ${status}: ${count}`)
  }
}

checkProviders()
