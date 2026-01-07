'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { UserRole, UserApprovalStatus } from '@/lib/auth/actions'

export type User = {
  id: string
  email: string
  name: string
  role: UserRole
  approval_status: UserApprovalStatus
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export type UserWithApprover = User & {
  approver?: { name: string } | null
  rejecter?: { name: string } | null
}

// Verificar se o utilizador atual é admin
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const typedProfile = profile as { role: UserRole } | null
  return typedProfile?.role === 'admin'
}

// Obter utilizador atual com perfil completo
export async function getCurrentUserProfile(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile as User | null
}

// Listar todos os utilizadores (apenas para admins)
export async function getUsers(filters?: {
  approval_status?: UserApprovalStatus
  role?: UserRole
}): Promise<UserWithApprover[]> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    throw new Error('Acesso negado')
  }

  const supabase = createAdminClient()

  let query = supabase
    .from('users')
    .select(`
      *,
      approver:approved_by(name),
      rejecter:rejected_by(name)
    `)
    .order('created_at', { ascending: false })

  if (filters?.approval_status) {
    query = query.eq('approval_status', filters.approval_status)
  }

  if (filters?.role) {
    query = query.eq('role', filters.role)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching users:', error)
    throw new Error('Erro ao carregar utilizadores')
  }

  // Normalizar relações (Supabase pode retornar array)
  return (data || []).map(user => ({
    ...user,
    approver: Array.isArray(user.approver) ? user.approver[0] : user.approver,
    rejecter: Array.isArray(user.rejecter) ? user.rejecter[0] : user.rejecter,
  })) as UserWithApprover[]
}

// Aprovar utilizador
export async function approveUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Acesso negado' }
  }

  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  if (!currentUser) {
    return { success: false, error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('users')
    .update({
      approval_status: 'approved',
      approved_by: currentUser.id,
      approved_at: new Date().toISOString(),
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
    })
    .eq('id', userId)

  if (error) {
    console.error('Error approving user:', error)
    return { success: false, error: 'Erro ao aprovar utilizador' }
  }

  revalidatePath('/admin/utilizadores')
  return { success: true }
}

// Rejeitar utilizador
export async function rejectUser(
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Acesso negado' }
  }

  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  if (!currentUser) {
    return { success: false, error: 'Não autenticado' }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('users')
    .update({
      approval_status: 'rejected',
      rejected_by: currentUser.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason || null,
      approved_by: null,
      approved_at: null,
    })
    .eq('id', userId)

  if (error) {
    console.error('Error rejecting user:', error)
    return { success: false, error: 'Erro ao rejeitar utilizador' }
  }

  revalidatePath('/admin/utilizadores')
  return { success: true }
}

// Alterar role do utilizador
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Acesso negado' }
  }

  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // Não permitir que admin remova seu próprio role de admin
  if (currentUser?.id === userId && role !== 'admin') {
    return { success: false, error: 'Não podes remover o teu próprio role de admin' }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('users')
    .update({ role })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user role:', error)
    return { success: false, error: 'Erro ao atualizar role' }
  }

  revalidatePath('/admin/utilizadores')
  return { success: true }
}

// Contar utilizadores pendentes (para badge no menu)
export async function getPendingUsersCount(): Promise<number> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) return 0

  const adminClient = createAdminClient()

  const { count, error } = await adminClient
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'pending')

  if (error) {
    console.error('Error counting pending users:', error)
    return 0
  }

  return count || 0
}
