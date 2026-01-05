import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabaseUrl = 'https://nyrnjltpyedfoommmbhs.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cm5qbHRweWVkZm9vbW1tYmhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYxOTc2MywiZXhwIjoyMDgzMTk1NzYzfQ.E4dKY1mKSbbvsqHYs2pQvGTBpCRyYOVpEVHz-BDphdY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigrations() {
  console.log('A executar migracoes...\n')

  // Ler ficheiros de migracao
  const migration1 = readFileSync(join(__dirname, '../supabase/migrations/00001_initial_schema.sql'), 'utf8')
  const migration2 = readFileSync(join(__dirname, '../supabase/migrations/00002_seed_data.sql'), 'utf8')

  // Executar via pg_dump nao e possivel via REST API
  // Precisamos usar o SQL Editor do Supabase Dashboard

  console.log('IMPORTANTE: As migracoes precisam de ser executadas no SQL Editor do Supabase.')
  console.log('\nPasso a passo:')
  console.log('1. Vai a https://supabase.com/dashboard/project/nyrnjltpyedfoommmbhs/sql/new')
  console.log('2. Cola o conteudo de: supabase/migrations/00001_initial_schema.sql')
  console.log('3. Clica em "Run"')
  console.log('4. Depois cola: supabase/migrations/00002_seed_data.sql')
  console.log('5. Clica em "Run" novamente')
  console.log('\nAlternativamente, podes usar o Supabase CLI:')
  console.log('npx supabase link --project-ref nyrnjltpyedfoommmbhs')
  console.log('npx supabase db push')
}

runMigrations()
