import { Sidebar } from '@/components/layout/sidebar'
import { getUserProfile } from '@/lib/auth/actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserProfile()

  return (
    <div className="flex h-screen">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}
