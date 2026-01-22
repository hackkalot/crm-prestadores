'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, CheckCircle2 } from 'lucide-react'
import { bulkUpdatePermissions, type Role, type Page } from '@/lib/permissions/actions'
import { toast } from 'sonner'

interface PermissionsTabProps {
  roles: Role[]
  pages: Page[]
  permissions: Record<string, Record<string, boolean>>
}

// Group pages by section
function groupPagesBySection(pages: Page[]): Record<string, Page[]> {
  const grouped: Record<string, Page[]> = {}

  pages.forEach(page => {
    const section = page.section || 'Outros'
    if (!grouped[section]) {
      grouped[section] = []
    }
    grouped[section].push(page)
  })

  return grouped
}

// Section labels in Portuguese
const SECTION_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  rede: 'Rede',
  gestao: 'Gestao',
  admin: 'Admin',
  Outros: 'Outros',
}

export function PermissionsTab({ roles, pages, permissions }: PermissionsTabProps) {
  const router = useRouter()
  const [localPermissions, setLocalPermissions] = useState<Record<string, Record<string, boolean>>>(
    () => {
      // Initialize with existing permissions
      const initial: Record<string, Record<string, boolean>> = {}
      roles.forEach(role => {
        initial[role.id] = {}
        pages.forEach(page => {
          initial[role.id][page.key] = permissions[role.id]?.[page.key] ?? false
        })
      })
      return initial
    }
  )
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({})
  const [savingRoles, setSavingRoles] = useState<Set<string>>(new Set())

  const groupedPages = groupPagesBySection(pages)

  const handlePermissionChange = useCallback((roleId: string, pageKey: string, checked: boolean) => {
    setLocalPermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [pageKey]: checked,
      },
    }))
    setPendingChanges(prev => ({
      ...prev,
      [roleId]: true,
    }))
  }, [])

  const handleSaveRole = async (roleId: string) => {
    setSavingRoles(prev => new Set(prev).add(roleId))

    const rolePermissions = localPermissions[roleId]
    const result = await bulkUpdatePermissions(roleId, rolePermissions)

    setSavingRoles(prev => {
      const next = new Set(prev)
      next.delete(roleId)
      return next
    })

    if (result.success) {
      toast.success('Permissoes guardadas com sucesso')
      setPendingChanges(prev => {
        const next = { ...prev }
        delete next[roleId]
        return next
      })
      router.refresh()
    } else {
      toast.error(result.error || 'Erro ao guardar permissoes')
    }
  }

  const handleToggleAll = (roleId: string, checked: boolean) => {
    setLocalPermissions(prev => {
      const updated = { ...prev[roleId] }
      pages.forEach(page => {
        updated[page.key] = checked
      })
      return {
        ...prev,
        [roleId]: updated,
      }
    })
    setPendingChanges(prev => ({
      ...prev,
      [roleId]: true,
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Acessos</CardTitle>
          <CardDescription>
            Configure quais paginas cada role pode aceder. As alteracoes sao guardadas por role.
          </CardDescription>
        </CardHeader>
      </Card>

      {roles.map(role => {
        const isSaving = savingRoles.has(role.id)
        const hasChanges = pendingChanges[role.id]
        const rolePerms = localPermissions[role.id] || {}

        // Count enabled permissions
        const enabledCount = Object.values(rolePerms).filter(Boolean).length

        return (
          <Card key={role.id}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  {role.is_system && (
                    <Badge variant="secondary">Sistema</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    ({enabledCount}/{pages.length} paginas)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAll(role.id, true)}
                  >
                    Selecionar Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAll(role.id, false)}
                  >
                    Limpar Todas
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveRole(role.id)}
                    disabled={isSaving || !hasChanges}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : hasChanges ? (
                      <Save className="h-4 w-4 mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    {hasChanges ? 'Guardar' : 'Guardado'}
                  </Button>
                </div>
              </div>
              {role.description && (
                <CardDescription>{role.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(groupedPages).map(([section, sectionPages]) => (
                  <div key={section} className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                      {SECTION_LABELS[section] || section}
                    </h4>
                    <div className="space-y-2">
                      {sectionPages.map(page => (
                        <div key={page.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${role.id}-${page.key}`}
                            checked={rolePerms[page.key] ?? false}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(role.id, page.key, !!checked)
                            }
                          />
                          <label
                            htmlFor={`${role.id}-${page.key}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {page.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
