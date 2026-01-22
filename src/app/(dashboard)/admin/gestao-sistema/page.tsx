import { Header } from '@/components/layout/header'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { getUsers, isCurrentUserAdmin } from '@/lib/users/actions'
import { getPermissionMatrix } from '@/lib/permissions/actions'
import { redirect } from 'next/navigation'
import type { UserApprovalStatus, UserRole } from '@/lib/auth/actions'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  // Verificar se é admin
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    redirect('/candidaturas')
  }

  const params = await searchParams

  const filters = {
    approval_status: params.status as UserApprovalStatus | undefined,
    role: params.role as UserRole | undefined,
  }

  // Buscar dados em paralelo
  const [users, allUsers, permissionMatrix] = await Promise.all([
    getUsers(filters),
    getUsers(),
    getPermissionMatrix(),
  ])

  const counts = {
    total: allUsers.length,
    pending: allUsers.filter(u => u.approval_status === 'pending').length,
    approved: allUsers.filter(u => u.approval_status === 'approved').length,
    rejected: allUsers.filter(u => u.approval_status === 'rejected').length,
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Gestão de Utilizadores"
        description="Aprovar registos, gerir roles e permissões"
      />
      <div className="flex-1 p-6 overflow-auto">
        <AdminTabs
          users={users}
          counts={counts}
          permissionMatrix={permissionMatrix}
        />
      </div>
    </div>
  )
}
