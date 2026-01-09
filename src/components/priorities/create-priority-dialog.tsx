'use client'

import { useState, useTransition, useActionState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, X, Loader2, AlertCircle } from 'lucide-react'
import { createPriority } from '@/lib/priorities/actions'
import {
  PRIORITY_TYPE_LABELS,
  PRIORITY_URGENCY_LABELS,
  type PriorityType,
  type PriorityUrgency,
} from '@/types/priorities'

interface CreatePriorityDialogProps {
  users: Array<{ id: string; name: string; email: string; role: string }>
  services: string[]
  districts: string[]
}

export function CreatePriorityDialog({
  users,
  services,
  districts,
}: CreatePriorityDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [type, setType] = useState<PriorityType>('ativar_prestadores')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([])
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [urgency, setUrgency] = useState<PriorityUrgency>('media')

  const [state, formAction] = useActionState(createPriority, null)

  // Filter users to show only RMs
  const relationshipManagers = users.filter(
    (u) => u.role === 'relationship_manager'
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Add criteria as JSON
    const criteria = {
      ...(selectedServices.length > 0 && { services: selectedServices }),
      ...(selectedDistricts.length > 0 && { districts: selectedDistricts }),
      ...(selectedEntityTypes.length > 0 && {
        entity_types: selectedEntityTypes,
      }),
    }
    formData.set('criteria', JSON.stringify(criteria))
    formData.set('assigned_users', JSON.stringify(selectedUsers))

    startTransition(async () => {
      await formAction(formData)
    })
  }

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form
      setType('ativar_prestadores')
      setSelectedServices([])
      setSelectedDistricts([])
      setSelectedEntityTypes([])
      setSelectedUsers([])
      setUrgency('media')
    }
    setOpen(newOpen)
  }

  // Close dialog on success
  if (state?.success && open) {
    setOpen(false)
  }

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    )
  }

  const toggleDistrict = (district: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(district)
        ? prev.filter((d) => d !== district)
        : [...prev, district]
    )
  }

  const toggleEntityType = (entityType: string) => {
    setSelectedEntityTypes((prev) =>
      prev.includes(entityType)
        ? prev.filter((e) => e !== entityType)
        : [...prev, entityType]
    )
  }

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((u) => u !== userId)
        : [...prev, userId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Prioridade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar Nova Prioridade</DialogTitle>
            <DialogDescription>
              Defina uma nova prioridade/KPI para acompanhar objetivos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {state?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="Ex: 10 prestadores de limpeza para Porto"
                required
                disabled={isPending}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Informações adicionais sobre esta prioridade..."
                rows={3}
                disabled={isPending}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Tipo <span className="text-red-500">*</span>
              </Label>
              <Select
                name="type"
                value={type}
                onValueChange={(v) => setType(v as PriorityType)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {type === 'ativar_prestadores' &&
                  'Progresso calculado automaticamente ao ativar prestadores'}
                {type === 'concluir_onboardings' &&
                  'Progresso calculado automaticamente ao concluir onboardings'}
                {type === 'outro' && 'Progresso atualizado manualmente'}
              </p>
            </div>

            {/* Criteria - only for auto types */}
            {type !== 'outro' && (
              <div className="space-y-4 border rounded-lg p-4">
                <h4 className="font-medium">Critérios</h4>

                {/* Services */}
                <div className="space-y-2">
                  <Label>Serviços</Label>
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <Badge
                        key={service}
                        variant={
                          selectedServices.includes(service)
                            ? 'default'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => toggleService(service)}
                      >
                        {service}
                        {selectedServices.includes(service) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Districts */}
                <div className="space-y-2">
                  <Label>Distritos</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {districts.map((district) => (
                      <Badge
                        key={district}
                        variant={
                          selectedDistricts.includes(district)
                            ? 'default'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => toggleDistrict(district)}
                      >
                        {district}
                        {selectedDistricts.includes(district) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Entity Types */}
                <div className="space-y-2">
                  <Label>Tipos de Entidade</Label>
                  <div className="flex flex-wrap gap-2">
                    {['tecnico', 'eni', 'empresa'].map((entityType) => (
                      <Badge
                        key={entityType}
                        variant={
                          selectedEntityTypes.includes(entityType)
                            ? 'default'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => toggleEntityType(entityType)}
                      >
                        {entityType === 'tecnico' && 'Técnico'}
                        {entityType === 'eni' && 'ENI'}
                        {entityType === 'empresa' && 'Empresa'}
                        {selectedEntityTypes.includes(entityType) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Target Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_value">
                  Valor Objetivo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="target_value"
                  name="target_value"
                  type="number"
                  min="1"
                  placeholder="10"
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade</Label>
                <Input
                  id="unit"
                  name="unit"
                  placeholder="prestadores"
                  defaultValue="prestadores"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Deadline and Urgency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">Prazo</Label>
                <Input
                  id="deadline"
                  name="deadline"
                  type="date"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgency">Urgência</Label>
                <Select
                  name="urgency"
                  value={urgency}
                  onValueChange={(v) => setUrgency(v as PriorityUrgency)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_URGENCY_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assigned Users */}
            <div className="space-y-2">
              <Label>Atribuir a Utilizadores</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                {relationshipManagers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum Relationship Manager disponível
                  </p>
                ) : (
                  relationshipManagers.map((user) => (
                    <Badge
                      key={user.id}
                      variant={
                        selectedUsers.includes(user.id) ? 'default' : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => toggleUser(user.id)}
                    >
                      {user.name}
                      {selectedUsers.includes(user.id) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Prioridade
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
