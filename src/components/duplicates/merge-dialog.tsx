'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  getProvidersForMerge,
  mergeProviders,
  type MergeFieldSelection,
} from '@/lib/duplicates/actions'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, GitMerge, Check } from 'lucide-react'

interface MergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerAId: string
  providerBId: string
  onMergeComplete: () => void
}

interface ProviderData {
  id: string
  name: string
  email: string
  phone: string | null
  nif: string | null
  entity_type: string
  website: string | null
  services: string[] | null
  districts: string[] | null
  num_technicians: number | null
  has_admin_team: boolean | null
  has_own_transport: boolean | null
  working_hours: string | null
  status: string
  relationship_owner: { id: string; name: string; email: string } | null
  relationship_owner_id: string | null
  notes: { count: number }[]
  history: { count: number }[]
  prices: { count: number }[]
  onboarding_card: { id: string } | null
}

type FieldKey = keyof MergeFieldSelection
type FieldValue = 'A' | 'B' | 'merge'

const fieldLabels: Record<FieldKey, string> = {
  name: 'Nome',
  email: 'Email',
  phone: 'Telefone',
  nif: 'NIF',
  entity_type: 'Tipo de Entidade',
  website: 'Website',
  services: 'Servicos',
  districts: 'Distritos',
  num_technicians: 'Num. Tecnicos',
  has_admin_team: 'Equipa Administrativa',
  has_own_transport: 'Transporte Proprio',
  working_hours: 'Horario Laboral',
  status: 'Estado',
  relationship_owner_id: 'Responsavel',
}

const arrayFields: FieldKey[] = ['services', 'districts']

export function MergeDialog({
  open,
  onOpenChange,
  providerAId,
  providerBId,
  onMergeComplete,
}: MergeDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [providerA, setProviderA] = useState<ProviderData | null>(null)
  const [providerB, setProviderB] = useState<ProviderData | null>(null)
  const [selections, setSelections] = useState<MergeFieldSelection>({
    name: 'A',
    email: 'A',
    phone: 'A',
    nif: 'A',
    entity_type: 'A',
    website: 'A',
    services: 'A',
    districts: 'A',
    num_technicians: 'A',
    has_admin_team: 'A',
    has_own_transport: 'A',
    working_hours: 'A',
    status: 'A',
    relationship_owner_id: 'A',
  })

  useEffect(() => {
    if (open && providerAId && providerBId) {
      setIsLoading(true)
      getProvidersForMerge(providerAId, providerBId)
        .then(({ providerA, providerB }) => {
          setProviderA(providerA as ProviderData)
          setProviderB(providerB as ProviderData)
        })
        .catch(() => {
          toast.error('Erro ao carregar prestadores')
          onOpenChange(false)
        })
        .finally(() => setIsLoading(false))
    }
  }, [open, providerAId, providerBId, onOpenChange])

  const handleSelectionChange = (field: FieldKey, value: FieldValue) => {
    setSelections(prev => ({ ...prev, [field]: value }))
  }

  const handleMerge = () => {
    startTransition(async () => {
      try {
        const result = await mergeProviders(providerAId, providerBId, selections)
        if (result.success) {
          toast.success('Prestadores fundidos com sucesso!')
          onMergeComplete()
        } else {
          toast.error(result.error || 'Erro ao fundir prestadores')
        }
      } catch {
        toast.error('Erro ao fundir prestadores')
      }
    })
  }

  const getDisplayValue = (provider: ProviderData | null, field: FieldKey): string => {
    if (!provider) return '-'

    switch (field) {
      case 'services':
      case 'districts':
        const arr = provider[field]
        if (!arr || arr.length === 0) return '(vazio)'
        return arr.slice(0, 3).join(', ') + (arr.length > 3 ? ` +${arr.length - 3}` : '')
      case 'has_admin_team':
      case 'has_own_transport':
        const bool = provider[field]
        return bool === null ? '(nao definido)' : bool ? 'Sim' : 'Nao'
      case 'relationship_owner_id':
        return provider.relationship_owner?.name || '(nao atribuido)'
      default:
        const value = provider[field as keyof ProviderData]
        if (value === null || value === undefined || value === '') return '(vazio)'
        return String(value)
    }
  }

  const getRelatedDataSummary = (provider: ProviderData | null): string[] => {
    if (!provider) return []
    const summary: string[] = []

    const notesCount = provider.notes?.[0]?.count || 0
    if (notesCount > 0) summary.push(`${notesCount} notas`)

    const historyCount = provider.history?.[0]?.count || 0
    if (historyCount > 0) summary.push(`${historyCount} registos historico`)

    const pricesCount = provider.prices?.[0]?.count || 0
    if (pricesCount > 0) summary.push(`${pricesCount} precos`)

    if (provider.onboarding_card) summary.push('1 onboarding card')

    return summary
  }

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>A carregar...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Fundir Prestadores
          </DialogTitle>
          <DialogDescription>
            Selecione qual valor manter para cada campo. O Prestador B sera apagado apos a fusao.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Header with provider names */}
            <div className="grid grid-cols-[200px_1fr_1fr] gap-4 items-center sticky top-0 bg-background pb-2 border-b">
              <div className="text-sm font-medium text-muted-foreground">Campo</div>
              <div className="text-center">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                  A - {providerA?.name}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {getRelatedDataSummary(providerA).join(' • ') || 'Sem dados relacionados'}
                </p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950">
                  B - {providerB?.name}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {getRelatedDataSummary(providerB).join(' • ') || 'Sem dados relacionados'}
                </p>
              </div>
            </div>

            {/* Field rows */}
            {(Object.keys(fieldLabels) as FieldKey[]).map((field) => {
              const valueA = getDisplayValue(providerA, field)
              const valueB = getDisplayValue(providerB, field)
              const isArray = arrayFields.includes(field)
              const isDifferent = valueA !== valueB

              return (
                <div
                  key={field}
                  className={`grid grid-cols-[200px_1fr_1fr] gap-4 items-start py-3 ${
                    isDifferent ? 'bg-amber-50/50 dark:bg-amber-950/20 -mx-4 px-4 rounded-lg' : ''
                  }`}
                >
                  <div>
                    <Label className="font-medium">{fieldLabels[field]}</Label>
                    {isDifferent && (
                      <Badge variant="outline" className="text-xs mt-1 bg-amber-100 dark:bg-amber-900">
                        Diferente
                      </Badge>
                    )}
                  </div>

                  <RadioGroup
                    value={selections[field]}
                    onValueChange={(value) => handleSelectionChange(field, value as FieldValue)}
                    className="contents"
                  >
                    {/* Option A */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selections[field] === 'A'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value="A" className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-words">{valueA}</p>
                      </div>
                      {selections[field] === 'A' && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </label>

                    {/* Option B */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selections[field] === 'B'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value="B" className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-words">{valueB}</p>
                      </div>
                      {selections[field] === 'B' && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </label>
                  </RadioGroup>

                  {/* Merge option for array fields */}
                  {isArray && (
                    <div className="col-start-2 col-span-2">
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selections[field] === 'merge'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={field}
                          value="merge"
                          checked={selections[field] === 'merge'}
                          onChange={() => handleSelectionChange(field, 'merge')}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Juntar ambos</p>
                          <p className="text-xs text-muted-foreground">
                            Combina os valores de A e B (remove duplicados)
                          </p>
                        </div>
                        {selections[field] === 'merge' && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </label>
                    </div>
                  )}
                </div>
              )
            })}

            <Separator className="my-4" />

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Atencao: Esta acao e irreversivel</p>
                <p className="text-muted-foreground mt-1">
                  O prestador <strong>{providerB?.name}</strong> sera permanentemente apagado.
                  Todas as notas, historico, precos e onboarding serao transferidos para{' '}
                  <strong>{providerA?.name}</strong>.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={isPending} variant="destructive">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                A fundir...
              </>
            ) : (
              <>
                <GitMerge className="h-4 w-4 mr-2" />
                Fundir Prestadores
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
