import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nyrnjltpyedfoommmbhs.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cm5qbHRweWVkZm9vbW1tYmhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYxOTc2MywiZXhwIjoyMDgzMTk1NzYzfQ.E4dKY1mKSbbvsqHYs2pQvGTBpCRyYOVpEVHz-BDphdY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testUsers = [
  { email: 'yola@fixo.pt', name: 'Yola', password: 'fixo2024' },
  { email: 'ricardo@fixo.pt', name: 'Ricardo', password: 'fixo2024' },
  { email: 'ops@fixo.pt', name: 'Ops', password: 'fixo2024' },
]

async function createTestUsers() {
  console.log('A criar utilizadores de teste...\n')

  for (const user of testUsers) {
    console.log(`Criando ${user.name} (${user.email})...`)

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Confirma email automaticamente
      user_metadata: {
        name: user.name
      }
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`  -> Utilizador ja existe, a ignorar.`)
      } else {
        console.error(`  -> Erro: ${error.message}`)
      }
    } else {
      console.log(`  -> Criado com sucesso! ID: ${data.user.id}`)
    }
  }

  console.log('\n---')
  console.log('Utilizadores de teste criados!')
  console.log('Podes fazer login com:')
  testUsers.forEach(u => {
    console.log(`  - ${u.email} / ${u.password}`)
  })
}

createTestUsers()
