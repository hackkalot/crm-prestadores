import { Sidebar } from '@/components/layout/sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // name e email vêm do user_metadata do auth - sem query extra
  const userData = user ? {
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
  } : null

  return (
    <div className="flex h-screen">
      <Sidebar user={userData} />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}
