'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
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
import { changeCardOwner, completeOnboarding } from '@/lib/onboarding/actions'
import { CheckCircle2, UserCog } from 'lucide-react'

interface OnboardingActionsProps {
  cardId: string
  ownerId?: string
  ownerName?: string | null
  users: Array<{ id: string; name: string | null; email: string }>
  canComplete: boolean
}

export function OnboardingActions({ cardId, ownerId, ownerName, users, canComplete }: OnboardingActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState(ownerId || '')

  // Calcular o label a mostrar no trigger
  const getDisplayLabel = () => {
    if (!selectedOwnerId) return 'Atribuir responsavel'

    // Primeiro procurar na lista de users
    const user = users.find(u => u.id === selectedOwnerId)
    if (user) return user.name || user.email || 'Utilizador'

    // Se nao encontrar, usar o ownerName passado
    if (ownerName) return ownerName

    return 'Atribuir responsavel'
  }

  const handleOwnerChange = (newOwnerId: string) => {
    setSelectedOwnerId(newOwnerId)
    startTransition(async () => {
      const formData = new FormData()
      formData.append('cardId', cardId)
      formData.append('ownerId', newOwnerId)
      await changeCardOwner({}, formData)
    })
  }

  const handleComplete = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('cardId', cardId)
      const result = await completeOnboarding({}, formData)
      if (result.success) {
        router.push('/onboarding')
      }
    })
    setShowCompleteDialog(false)
  }

  return (
    <div className="flex items-center gap-3">
      {/* Owner selector */}
      <div className="flex items-center gap-2">
        <UserCog className="h-4 w-4 text-muted-foreground" />
        <Select
          value={selectedOwnerId}
          onValueChange={handleOwnerChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-50">
            <span className="truncate">{getDisplayLabel()}</span>
          </SelectTrigger>
          <SelectContent>
            {/* Se o owner atual nao esta na lista, adiciona-lo */}
            {selectedOwnerId && !users.find(u => u.id === selectedOwnerId) && ownerName && (
              <SelectItem key={selectedOwnerId} value={selectedOwnerId}>
                {ownerName}
              </SelectItem>
            )}
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.email || 'Utilizador'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Complete button */}
      <Button
        onClick={() => setShowCompleteDialog(true)}
        disabled={!canComplete || isPending}
        className="bg-green-600 hover:bg-green-700"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Concluir Onboarding
      </Button>

      {/* Confirmation dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir Onboarding</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja concluir este onboarding? O prestador sera
              automaticamente ativado e ficara disponivel para receber trabalhos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
