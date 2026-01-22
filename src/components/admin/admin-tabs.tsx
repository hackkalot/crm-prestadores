'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsersTable } from './users-table'
import { UserFilters } from './user-filters'
import { RolesTab } from './roles-tab'
import { PermissionsTab } from './permissions-tab'
import type { UserWithApprover } from '@/lib/users/actions'
import type { PermissionMatrix } from '@/lib/permissions/actions'
import { Users, Shield, Key } from 'lucide-react'

interface AdminTabsProps {
  // Users tab data
  users: UserWithApprover[]
  counts: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  // Roles & Permissions tab data
  permissionMatrix: PermissionMatrix
}

export function AdminTabs({
  users,
  counts,
  permissionMatrix,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="users" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Utilizadores
        </TabsTrigger>
        <TabsTrigger value="roles" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Roles
        </TabsTrigger>
        <TabsTrigger value="permissions" className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          Acessos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="space-y-6">
        <UserFilters counts={counts} />
        <UsersTable users={users} roles={permissionMatrix.roles} />
      </TabsContent>

      <TabsContent value="roles">
        <RolesTab roles={permissionMatrix.roles} />
      </TabsContent>

      <TabsContent value="permissions">
        <PermissionsTab
          roles={permissionMatrix.roles}
          pages={permissionMatrix.pages}
          permissions={permissionMatrix.permissions}
        />
      </TabsContent>
    </Tabs>
  )
}
