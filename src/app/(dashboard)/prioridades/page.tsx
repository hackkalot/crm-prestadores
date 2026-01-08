import { Header } from '@/components/layout/header'
import { getAllPriorities } from '@/lib/priorities/actions'
import { getUsers } from '@/lib/providers/actions'
import { getDistinctServices, getDistinctDistricts } from '@/lib/candidaturas/actions'
import { CreatePriorityDialog } from '@/components/priorities/create-priority-dialog'
import { PriorityListAdmin } from '@/components/priorities/priority-list-admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PrioridadesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is manager or admin
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userProfile || !userProfile.role || !['admin', 'manager'].includes(userProfile.role)) {
    redirect('/prestadores')
  }

  // Fetch data in parallel
  const [priorities, users, services, districts] = await Promise.all([
    getAllPriorities(),
    getUsers(),
    getDistinctServices(),
    getDistinctDistricts(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Prioridades"
        description="Gestão de prioridades e objetivos"
      />

      <div className="flex-1 p-6 overflow-auto space-y-4">
        <div className="flex justify-end">
          <CreatePriorityDialog
            users={users}
            services={services}
            districts={districts}
          />
        </div>
        <PriorityListAdmin priorities={priorities} />
      </div>
    </div>
  )
}
