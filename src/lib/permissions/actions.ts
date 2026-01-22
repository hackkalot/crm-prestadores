'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Types
export interface Role {
  id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface Page {
  id: string
  key: string
  name: string
  path: string
  section: string | null
  display_order: number
  is_active: boolean
}

export interface RolePermission {
  role_id: string
  page_id: string
  can_access: boolean
}

export interface PermissionMatrix {
  roles: Role[]
  pages: Page[]
  permissions: Record<string, Record<string, boolean>> // role_id -> page_key -> can_access
}

// Helper to check if current user is admin
async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await createAdminClient()
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return data?.role === 'admin'
}

// Get all roles
export async function getRoles(): Promise<Role[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await createAdminClient()
    .from('roles')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching roles:', error)
    return []
  }

  return data || []
}

// Get all pages
export async function getPages(): Promise<Page[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await createAdminClient()
    .from('pages')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (error) {
    console.error('Error fetching pages:', error)
    return []
  }

  return data || []
}

// Get complete permission matrix for admin UI
export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { roles: [], pages: [], permissions: {} }
  }

  const admin = createAdminClient()

  const [rolesResult, pagesResult, permissionsResult] = await Promise.all([
    admin.from('roles').select('*').order('name'),
    admin.from('pages').select('*').eq('is_active', true).order('display_order'),
    admin.from('role_permissions').select('role_id, page_id, can_access'),
  ])

  const roles = rolesResult.data || []
  const pages = pagesResult.data || []
  const rawPermissions = permissionsResult.data || []

  // Build page key lookup
  const pageKeyById: Record<string, string> = {}
  pages.forEach(p => {
    pageKeyById[p.id] = p.key
  })

  // Build permissions matrix: role_id -> page_key -> can_access
  const permissions: Record<string, Record<string, boolean>> = {}
  rawPermissions.forEach(rp => {
    if (!permissions[rp.role_id]) {
      permissions[rp.role_id] = {}
    }
    const pageKey = pageKeyById[rp.page_id]
    if (pageKey) {
      permissions[rp.role_id][pageKey] = rp.can_access
    }
  })

  return { roles, pages, permissions }
}

// Create a new role
export async function createRole(
  name: string,
  description: string | null
): Promise<{ success: boolean; role?: Role; error?: string }> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Acesso negado' }
  }

  const admin = createAdminClient()

  // Create the role
  const { data: role, error: roleError } = await admin
    .from('roles')
    .insert({ name, description, is_system: false })
    .select()
    .single()

  if (roleError) {
    console.error('Error creating role:', roleError)
    return { success: false, error: roleError.message }
  }

  // Create default permissions (all false) for all pages
  const { data: pages } = await admin.from('pages').select('id')
  if (pages && pages.length > 0) {
    const permissions = pages.map(p => ({
      role_id: role.id,
      page_id: p.id,
      can_access: false,
    }))

    await admin.from('role_permissions').insert(permissions)
  }

  revalidatePath('/admin/utilizadores')
  return { success: true, role }
}

// Update an existing role
export async function updateRole(
  id: string,
  name: string,
  description: string | null
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Acesso negado' }
  }

  const { error } = await createAdminClient()
    .from('roles')
    .update({ name, description })
    .eq('id', id)

  if (error) {
    console.error('Error updating role:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/utilizadores')
  return { success: true }
}

// Delete a role (only non-system roles)
export async function deleteRole(id: string): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Acesso negado' }
  }

  const admin = createAdminClient()

  // Check if it's a system role
  const { data: role } = await admin
    .from('roles')
    .select('is_system')
    .eq('id', id)
    .single()

  if (role?.is_system) {
    return { success: false, error: 'Nao e possivel apagar roles do sistema' }
  }

  // Delete the role (permissions will cascade)
  const { error } = await admin
    .from('roles')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting role:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/utilizadores')
  return { success: true }
}

// Update a single permission
export async function updatePermission(
  roleId: string,
  pageKey: string,
  canAccess: boolean
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Acesso negado' }
  }

  const admin = createAdminClient()

  // Get page ID from key
  const { data: page } = await admin
    .from('pages')
    .select('id')
    .eq('key', pageKey)
    .single()

  if (!page) {
    return { success: false, error: 'Pagina nao encontrada' }
  }

  // Upsert the permission
  const { error } = await admin
    .from('role_permissions')
    .upsert({
      role_id: roleId,
      page_id: page.id,
      can_access: canAccess,
    }, {
      onConflict: 'role_id,page_id',
    })

  if (error) {
    console.error('Error updating permission:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/utilizadores')
  revalidatePath('/')
  return { success: true }
}

// Bulk update permissions for a role
export async function bulkUpdatePermissions(
  roleId: string,
  permissions: Record<string, boolean>
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Acesso negado' }
  }

  const admin = createAdminClient()

  // Get all page IDs by key
  const { data: pages } = await admin.from('pages').select('id, key')
  if (!pages) {
    return { success: false, error: 'Erro ao buscar paginas' }
  }

  const pageIdByKey: Record<string, string> = {}
  pages.forEach(p => {
    pageIdByKey[p.key] = p.id
  })

  // Build upsert data
  const upsertData = Object.entries(permissions)
    .filter(([key]) => pageIdByKey[key])
    .map(([key, canAccess]) => ({
      role_id: roleId,
      page_id: pageIdByKey[key],
      can_access: canAccess,
    }))

  if (upsertData.length === 0) {
    return { success: true }
  }

  const { error } = await admin
    .from('role_permissions')
    .upsert(upsertData, {
      onConflict: 'role_id,page_id',
    })

  if (error) {
    console.error('Error bulk updating permissions:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/utilizadores')
  revalidatePath('/')
  return { success: true }
}

// Get accessible page keys for a specific user
export async function getUserAccessiblePages(userId?: string): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const targetUserId = userId || user?.id
  if (!targetUserId) return []

  const admin = createAdminClient()

  // Get user's role
  const { data: userData } = await admin
    .from('users')
    .select('role')
    .eq('id', targetUserId)
    .single()

  if (!userData?.role) return []

  // Get role ID
  const { data: roleData } = await admin
    .from('roles')
    .select('id')
    .eq('name', userData.role)
    .single()

  if (!roleData) return []

  // Get all accessible pages
  const { data: permissions } = await admin
    .from('role_permissions')
    .select('pages(key)')
    .eq('role_id', roleData.id)
    .eq('can_access', true)

  if (!permissions) return []

  return permissions
    .map(p => {
      // pages can be an object or array depending on Supabase response
      const pages = p.pages as { key: string } | { key: string }[] | null
      if (!pages) return null
      if (Array.isArray(pages)) {
        return pages[0]?.key
      }
      return pages.key
    })
    .filter((key): key is string => !!key)
}

// Check if current user can access a specific page
export async function canCurrentUserAccessPage(pageKey: string): Promise<boolean> {
  const accessiblePages = await getUserAccessiblePages()
  return accessiblePages.includes(pageKey)
}

// Get pages grouped by section (for sidebar)
export async function getPagesGroupedBySection(): Promise<Record<string, Page[]>> {
  const pages = await getPages()

  const grouped: Record<string, Page[]> = {}
  pages.forEach(page => {
    const section = page.section || '_standalone'
    if (!grouped[section]) {
      grouped[section] = []
    }
    grouped[section].push(page)
  })

  return grouped
}
