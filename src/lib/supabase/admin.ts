import { createClient } from '@supabase/supabase-js'

// Cliente admin com service role key - usar apenas no servidor
// Bypass Row Level Security
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
