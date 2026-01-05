'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { updatePrestadorStatus, updateRelationshipOwner } from '@/lib/prestadores/actions'
import { toast } from 'sonner'
import { UserCog, AlertTriangle, Play, Pause } from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
}

interface PrestadorActionsProps {
  prestadorId: string
  currentStatus: string
  currentOwnerId?: string
  users: User[]
}

export function PrestadorActions({
  prestadorId,
  currentStatus,
  currentOwnerId,
  users,
}: PrestadorActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isOwnerDialogOpen, setIsOwnerDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<string>(
    currentStatus === 'ativo' ? 'suspenso' : 'ativo'
  )
  const [reason, setReason] = useState('')
  const [selectedOwner, setSelectedOwner] = useState(currentOwnerId || '')

  // Encontrar o label do owner selecionado
  const getOwnerLabel = (ownerId: string) => {
    const owner = users.find(u => u.id === ownerId)
    return owner ? (owner.name || owner.email || 'Utilizador') : null
  }

  const handleStatusChange = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('providerId', prestadorId)
      formData.append('status', newStatus)
      if (reason) formData.append('reason', reason)

      const result = await updatePrestadorStatus({}, formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(`Estado atualizado para ${newStatus === 'ativo' ? 'Ativo' : 'Suspenso'}`)
      setIsStatusDialogOpen(false)
      setReason('')
    })
  }

  const handleOwnerChange = () => {
    if (!selectedOwner) {
      toast.error('Selecione um responsavel')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('providerId', prestadorId)
      formData.append('ownerId', selectedOwner)

      const result = await updateRelationshipOwner({}, formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Responsavel atualizado')
      setIsOwnerDialogOpen(false)
    })
  }

  return (
    <div className="flex gap-2">
      {/* Change Owner Dialog */}
      <Dialog open={isOwnerDialogOpen} onOpenChange={setIsOwnerDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <UserCog className="h-4 w-4 mr-2" />
            Alterar Responsavel
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Responsavel da Relacao</DialogTitle>
            <DialogDescription>
              Selecione o novo responsavel pelo acompanhamento deste prestador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsavel</label>
              <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger>
                  <span className="truncate">{getOwnerLabel(selectedOwner) || 'Selecione um responsavel'}</span>
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email || 'Utilizador'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOwnerDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleOwnerChange} disabled={isPending}>
                {isPending ? 'A guardar...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogTrigger asChild>
          {currentStatus === 'ativo' ? (
            <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700">
              <Pause className="h-4 w-4 mr-2" />
              Suspender
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700">
              <Play className="h-4 w-4 mr-2" />
              Reativar
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentStatus === 'ativo' ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Suspender Prestador
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 text-green-500" />
                  Reativar Prestador
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {currentStatus === 'ativo'
                ? 'O prestador sera marcado como suspenso e nao recebera novos servicos.'
                : 'O prestador sera reativado e podera receber novos servicos.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Textarea
                placeholder="Descreva o motivo..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsStatusDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                variant={currentStatus === 'ativo' ? 'destructive' : 'default'}
                onClick={handleStatusChange}
                disabled={isPending}
              >
                {isPending
                  ? 'A processar...'
                  : currentStatus === 'ativo'
                    ? 'Suspender'
                    : 'Reativar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
