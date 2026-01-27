import { Sidebar } from '@/components/layout/sidebar'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import { MobileSidebarProvider } from '@/components/layout/mobile-sidebar-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserAccessiblePages } from '@/lib/permissions/actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Buscar perfil com role da tabela users
  let userData = null
  let pendingUsersCount = 0
  let accessiblePages: string[] = []

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', user.id)
      .single()

    const typedProfile = profile as { name: string; role: 'admin' | 'user' | 'manager' | 'relationship_manager' } | null

    userData = {
      name: typedProfile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      role: typedProfile?.role,
    }

    // Buscar paginas acessiveis para o user
    accessiblePages = await getUserAccessiblePages(user.id)

    // Se é admin, buscar contagem de pendentes
    if (typedProfile?.role === 'admin') {
      const adminClient = createAdminClient()
      const { count } = await adminClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending')

      pendingUsersCount = count || 0
    }
  }

  return (
    <MobileSidebarProvider>
      <div className="flex h-screen">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden lg:flex">
          <Sidebar
            user={userData}
            pendingUsersCount={pendingUsersCount}
            accessiblePages={accessiblePages}
          />
        </div>

        {/* Mobile sidebar drawer */}
        <MobileSidebar
          user={userData}
          pendingUsersCount={pendingUsersCount}
          accessiblePages={accessiblePages}
        />

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </MobileSidebarProvider>
  )
}
