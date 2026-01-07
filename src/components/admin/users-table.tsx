'use client'

import { useState, useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Input } from '@/components/ui/input'
import {
  Check,
  X,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { UserWithApprover } from '@/lib/users/actions'
import { approveUser, rejectUser, updateUserRole } from '@/lib/users/actions'

interface UsersTableProps {
  users: UserWithApprover[]
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendente',
    icon: Clock,
    variant: 'outline' as const,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  approved: {
    label: 'Aprovado',
    icon: CheckCircle2,
    variant: 'outline' as const,
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  rejected: {
    label: 'Rejeitado',
    icon: XCircle,
    variant: 'outline' as const,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
}

export function UsersTable({ users }: UsersTableProps) {
  const [isPending, startTransition] = useTransition()
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithApprover | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const handleApprove = (user: UserWithApprover) => {
    startTransition(async () => {
      const result = await approveUser(user.id)
      if (!result.success) {
        alert(result.error)
      }
    })
  }

  const handleRejectClick = (user: UserWithApprover) => {
    setSelectedUser(user)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  const handleRejectConfirm = () => {
    if (!selectedUser) return
    startTransition(async () => {
      const result = await rejectUser(selectedUser.id, rejectReason)
      if (!result.success) {
        alert(result.error)
      }
      setRejectDialogOpen(false)
      setSelectedUser(null)
    })
  }

  const handleToggleAdmin = (user: UserWithApprover) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    startTransition(async () => {
      const result = await updateUserRole(user.id, newRole)
      if (!result.success) {
        alert(result.error)
      }
    })
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum utilizador encontrado.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilizador</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Registado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const statusConfig = STATUS_CONFIG[user.approval_status]
              const StatusIcon = statusConfig.icon

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? (
                        <Shield className="h-3 w-3 mr-1" />
                      ) : null}
                      {user.role === 'admin' ? 'Admin' : 'Utilizador'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={statusConfig.variant} className={statusConfig.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      {user.approval_status === 'approved' && user.approver && (
                        <p className="text-xs text-muted-foreground">
                          por {user.approver.name}
                        </p>
                      )}
                      {user.approval_status === 'rejected' && user.rejecter && (
                        <p className="text-xs text-muted-foreground">
                          por {user.rejecter.name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true,
                        locale: pt,
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.approval_status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(user)}
                            disabled={isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRejectClick(user)}
                            disabled={isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.approval_status !== 'approved' && (
                            <DropdownMenuItem onClick={() => handleApprove(user)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Aprovar
                            </DropdownMenuItem>
                          )}
                          {user.approval_status !== 'rejected' && (
                            <DropdownMenuItem onClick={() => handleRejectClick(user)}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Rejeitar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleAdmin(user)}>
                            {user.role === 'admin' ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-2" />
                                Remover Admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Tornar Admin
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar utilizador</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres rejeitar o registo de{' '}
              <strong>{selectedUser?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Motivo (opcional)</label>
            <Input
              className="mt-2"
              placeholder="Ex: Email não corporativo"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
