'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Shield, Loader2 } from 'lucide-react'
import { createRole, updateRole, deleteRole, type Role } from '@/lib/permissions/actions'
import { toast } from 'sonner'

interface RolesTabProps {
  roles: Role[]
}

export function RolesTab({ roles }: RolesTabProps) {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const resetForm = () => {
    setName('')
    setDescription('')
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Nome e obrigatorio')
      return
    }

    setIsLoading(true)
    const result = await createRole(name.trim(), description.trim() || null)
    setIsLoading(false)

    if (result.success) {
      toast.success('Role criado com sucesso')
      resetForm()
      setIsCreateOpen(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Erro ao criar role')
    }
  }

  const handleUpdate = async () => {
    if (!editingRole || !name.trim()) {
      toast.error('Nome e obrigatorio')
      return
    }

    setIsLoading(true)
    const result = await updateRole(editingRole.id, name.trim(), description.trim() || null)
    setIsLoading(false)

    if (result.success) {
      toast.success('Role actualizado com sucesso')
      resetForm()
      setEditingRole(null)
      router.refresh()
    } else {
      toast.error(result.error || 'Erro ao actualizar role')
    }
  }

  const handleDelete = async () => {
    if (!deletingRole) return
    setIsLoading(true)
    const result = await deleteRole(deletingRole.id)
    setIsLoading(false)

    if (result.success) {
      toast.success('Role apagado com sucesso')
      setDeletingRole(null)
      router.refresh()
    } else {
      toast.error(result.error || 'Erro ao apagar role')
    }
  }

  const openEditDialog = (role: Role) => {
    setName(role.name)
    setDescription(role.description || '')
    setEditingRole(role)
  }

  const closeEditDialog = () => {
    resetForm()
    setEditingRole(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestao de Roles</CardTitle>
            <CardDescription>
              Crie e gira os roles do sistema. Roles de sistema nao podem ser apagados.
            </CardDescription>
          </div>

          {/* Create Role Dialog */}
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Role</DialogTitle>
                <DialogDescription>
                  Adicione um novo role ao sistema. Depois de criar, configure os acessos na tab Acessos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="ex: supervisor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descricao</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva as responsabilidades deste role..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-24">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    {role.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {role.description || '-'}
                </TableCell>
                <TableCell>
                  {role.is_system ? (
                    <Badge variant="secondary">Sistema</Badge>
                  ) : (
                    <Badge variant="outline">Customizado</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {/* Edit Dialog */}
                    <Dialog open={editingRole?.id === role.id} onOpenChange={(open) => {
                      if (!open) closeEditDialog()
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(role)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Role</DialogTitle>
                          <DialogDescription>
                            Actualize os detalhes do role.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name">Nome</Label>
                            <Input
                              id="edit-name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              disabled={role.is_system}
                            />
                            {role.is_system && (
                              <p className="text-xs text-muted-foreground">
                                Nomes de roles de sistema nao podem ser alterados.
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-description">Descricao</Label>
                            <Textarea
                              id="edit-description"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={closeEditDialog}>
                            Cancelar
                          </Button>
                          <Button onClick={handleUpdate} disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Guardar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={role.is_system}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingRole(role)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRole} onOpenChange={(open) => !open && setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar Role</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja apagar o role &quot;{deletingRole?.name}&quot;?
              Esta accao nao pode ser desfeita. Utilizadores com este role
              poderao perder acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingRole(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
