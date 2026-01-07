import { Header } from '@/components/layout/header'
import { UsersTable } from '@/components/admin/users-table'
import { UserFilters } from '@/components/admin/user-filters'
import { getUsers, isCurrentUserAdmin } from '@/lib/users/actions'
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

  const users = await getUsers(filters)

  // Contar por status
  const allUsers = await getUsers()
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
        description="Aprovar registos e gerir permissões"
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <UserFilters counts={counts} />
        <UsersTable users={users} />
      </div>
    </div>
  )
}
