/**
 * Template para queries rápidas à base de dados
 *
 * Uso: npx tsx scripts/db-queries/_template.ts
 *
 * Copiar este ficheiro e adaptar a query conforme necessário.
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Adaptar a query conforme necessário
  const { data, error } = await supabase
    .from('pages') // <- mudar tabela
    .select('*')   // <- mudar colunas
    .limit(10)     // <- mudar limite

  if (error) {
    console.error('Error:', error)
    return
  }

  console.table(data)
}

main()
