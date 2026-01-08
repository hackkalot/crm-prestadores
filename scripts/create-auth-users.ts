import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const users = [
  {
    email: 'mariana.mendonca.santiago@fidelidade.pt',
    password: 'Fidelidade2024!',
    name: 'Mariana Mendonça Santiago',
    role: 'manager',
  },
  {
    email: 'ricardo.alves.andrade@fidelidade.pt',
    password: 'Fidelidade2024!',
    name: 'Ricardo Alves Andrade',
    role: 'relationship_manager',
  },
  {
    email: 'yola.kiffen.rodrigues@fidelidade.pt',
    password: 'Fidelidade2024!',
    name: 'Yola Kiffen Rodrigues',
    role: 'relationship_manager',
  },
]

async function createAuthUsers() {
  console.log('Creating auth users...')

  for (const user of users) {
    try {
      // Create auth user
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        })

      if (authError) {
        console.error(`Error creating auth user ${user.email}:`, authError)
        continue
      }

      console.log(`✓ Created auth user: ${user.email}`)
      console.log(`  ID: ${authData.user.id}`)

      // Wait a bit for the trigger to create the user in the users table
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update the user's role and approval status
      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: user.role,
          approval_status: 'approved',
        })
        .eq('id', authData.user.id)

      if (updateError) {
        console.error(
          `Error updating role for ${user.email}:`,
          updateError
        )
      } else {
        console.log(
          `✓ Updated role to ${user.role} and approved: ${user.email}`
        )
      }
    } catch (error) {
      console.error(`Unexpected error for ${user.email}:`, error)
    }
  }

  console.log('\nDone! All users created.')
  console.log('\nLogin credentials:')
  users.forEach((u) => {
    console.log(`${u.name}: ${u.email} / ${u.password}`)
  })
}

createAuthUsers()
