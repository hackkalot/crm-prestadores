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

async function testQuery() {
  console.log('🔍 Testando query com status = "_all"...\n')

  // Simulating the query logic
  let query = supabase
    .from('providers')
    .select(`
      id,
      name,
      email,
      phone,
      entity_type,
      nif,
      districts,
      services,
      status,
      activated_at,
      relationship_owner:users!providers_relationship_owner_id_fkey(id, name, email)
    `)

  // No status filter (show all)
  console.log('Query sem filtro de status (deve mostrar todos)...\n')

  const { data, error } = await query.order('name')

  if (error) {
    console.error('❌ Erro:', error)
  } else {
    console.log(`✅ Encontrados ${data?.length || 0} prestadores`)
    if (data && data.length > 0) {
      console.log('\n📋 Primeiros 5:')
      data.slice(0, 5).forEach((p) => {
        console.log(`   - ${p.name} (${p.email}) - Status: ${p.status}`)
      })
    }
  }
}

testQuery()
