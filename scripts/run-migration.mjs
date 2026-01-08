import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://nyrnjltpyedfoommmbhs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cm5qbHRweWVkZm9vbW1tYmhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYxOTc2MywiZXhwIjoyMDgzMTk1NzYzfQ.E4dKY1mKSbbvsqHYs2pQvGTBpCRyYOVpEVHz-BDphdY'

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

const sql = readFileSync('migrations/add_social_media_fields.sql', 'utf-8')

// Split by semicolon and execute each statement
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`Executing ${statements.length} SQL statements...`)

for (const statement of statements) {
  console.log(`\nExecuting: ${statement.substring(0, 100)}...`)
  const { error } = await supabase.rpc('exec_sql', { sql: statement })

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✓ Success')
  }
}

console.log('\nMigration completed!')
