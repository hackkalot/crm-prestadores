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

async function cleanProviders() {
  console.log('🗑️  A remover todos os prestadores...')

  // Delete all providers
  const { error, count } = await supabase
    .from('providers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  } else {
    console.log('✅ Todos os prestadores foram removidos da base de dados')
  }
}

cleanProviders()
