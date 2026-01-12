'use client'

import { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, AlertCircle } from 'lucide-react'
import { createProvider } from '@/lib/providers/create-actions'
import { toast } from 'sonner'
import { MultiSelect } from '@/components/ui/multi-select'
import { useMounted } from '@/hooks/use-mounted'

interface CreateProviderDialogProps {
  districts: string[]
  services: string[]
}

export function CreateProviderDialog({ districts, services }: CreateProviderDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(createProvider, { success: false })
  const [entityType, setEntityType] = useState<'tecnico' | 'eni' | 'empresa'>('tecnico')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([])
  const [hasAdminTeam, setHasAdminTeam] = useState<boolean | undefined>(undefined)
  const [hasOwnTransport, setHasOwnTransport] = useState<boolean | undefined>(undefined)
  const mounted = useMounted()

  // Handle success
  useEffect(() => {
    if (state.success && open) {
      toast.success('Prestador criado com sucesso')
      setOpen(false)

      // Redirect to provider detail page
      if (state.provider_id) {
        router.push(`/providers/${state.provider_id}`)
      }
    }
  }, [state.success, state.provider_id, open, router])

  const handleReset = () => {
    setEntityType('tecnico')
    setSelectedServices([])
    setSelectedDistricts([])
    setHasAdminTeam(undefined)
    setHasOwnTransport(undefined)
  }

  const handleClose = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setTimeout(handleReset, 300)
    }
  }

  const isCompanyOrEni = entityType === 'empresa' || entityType === 'eni'

  // Render a placeholder button during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button className="gap-2">
        <UserPlus className="h-4 w-4" />
        Adicionar Prestador
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Adicionar Prestador
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Prestador</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo prestador
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {/* Error Message */}
          {state.error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{state.error}</p>
            </div>
          )}

          {/* Tipo de Entidade */}
          <div className="space-y-2">
            <Label htmlFor="entity_type">
              Tipo de Entidade <span className="text-destructive">*</span>
            </Label>
            <Select
              name="entity_type"
              value={entityType}
              onValueChange={(v) => setEntityType(v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="eni">ENI (Empresário em Nome Individual)</SelectItem>
                <SelectItem value="empresa">Empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome Completo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={
                entityType === 'empresa'
                  ? 'Nome da Empresa'
                  : entityType === 'eni'
                  ? 'Nome do ENI'
                  : 'Nome do Técnico'
              }
              required
              disabled={isPending}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="email@exemplo.com"
              required
              disabled={isPending}
            />
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+351 XXX XXX XXX"
              disabled={isPending}
            />
          </div>

          {/* NIF (apenas empresa e ENI) */}
          {isCompanyOrEni && (
            <div className="space-y-2">
              <Label htmlFor="nif">NIF</Label>
              <Input
                id="nif"
                name="nif"
                type="text"
                placeholder="XXXXXXXXX"
                disabled={isPending}
              />
            </div>
          )}

          {/* Website */}
          {isCompanyOrEni && (
            <div className="space-y-2">
              <Label htmlFor="website">Website / Redes Sociais</Label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://exemplo.com"
                disabled={isPending}
              />
            </div>
          )}

          {/* Serviços */}
          <div className="space-y-2">
            <Label htmlFor="services">Serviços</Label>
            <MultiSelect
              options={services.map((s) => ({ label: s, value: s }))}
              selected={selectedServices}
              onChange={setSelectedServices}
              placeholder="Selecionar serviços..."
              disabled={isPending}
            />
            <input
              type="hidden"
              name="services"
              value={JSON.stringify(selectedServices)}
            />
          </div>

          {/* Distritos */}
          <div className="space-y-2">
            <Label htmlFor="districts">Distritos</Label>
            <MultiSelect
              options={districts.map((d) => ({ label: d, value: d }))}
              selected={selectedDistricts}
              onChange={setSelectedDistricts}
              placeholder="Selecionar distritos..."
              disabled={isPending}
            />
            <input
              type="hidden"
              name="districts"
              value={JSON.stringify(selectedDistricts)}
            />
          </div>

          {/* Campos específicos de Empresa/ENI */}
          {isCompanyOrEni && (
            <>
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-medium">Informações da Equipa</h3>

                {/* Número de Técnicos */}
                <div className="space-y-2">
                  <Label htmlFor="num_technicians">Número de Técnicos</Label>
                  <Input
                    id="num_technicians"
                    name="num_technicians"
                    type="number"
                    min="0"
                    placeholder="0"
                    disabled={isPending}
                  />
                </div>

                {/* Equipa Administrativa */}
                <div className="space-y-2">
                  <Label htmlFor="has_admin_team">Tem Equipa Administrativa?</Label>
                  <Select
                    name="has_admin_team"
                    value={
                      hasAdminTeam === undefined
                        ? 'undefined'
                        : hasAdminTeam
                        ? 'true'
                        : 'false'
                    }
                    onValueChange={(v) =>
                      setHasAdminTeam(
                        v === 'undefined' ? undefined : v === 'true'
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Não especificado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="undefined">Não especificado</SelectItem>
                      <SelectItem value="true">Sim</SelectItem>
                      <SelectItem value="false">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Transporte Próprio */}
                <div className="space-y-2">
                  <Label htmlFor="has_own_transport">Tem Transporte Próprio?</Label>
                  <Select
                    name="has_own_transport"
                    value={
                      hasOwnTransport === undefined
                        ? 'undefined'
                        : hasOwnTransport
                        ? 'true'
                        : 'false'
                    }
                    onValueChange={(v) =>
                      setHasOwnTransport(
                        v === 'undefined' ? undefined : v === 'true'
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Não especificado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="undefined">Não especificado</SelectItem>
                      <SelectItem value="true">Sim</SelectItem>
                      <SelectItem value="false">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Horário Laboral */}
                <div className="space-y-2">
                  <Label htmlFor="working_hours">Horário Laboral</Label>
                  <Input
                    id="working_hours"
                    name="working_hours"
                    type="text"
                    placeholder="Ex: 9h-18h"
                    disabled={isPending}
                  />
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'A criar...' : 'Criar Prestador'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
