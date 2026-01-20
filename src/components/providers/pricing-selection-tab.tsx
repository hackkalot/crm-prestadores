'use client'

import { useState, useActionState, useEffect, useTransition } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, FileText, AlertCircle, CheckCircle2, Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  toggleServiceSelection,
  updateCustomPrice,
  bulkToggleServices,
  autoSelectServicesFromForms,
  generateProposalPDFData,
  type PricingCluster,
} from '@/lib/providers/pricing-actions'
import { generateProposalPDFHTML } from '@/lib/providers/pdf-actions'

interface PricingSelectionTabProps {
  providerId: string
  providerName: string
  hasFormsSubmitted: boolean
  clusters: PricingCluster[]
  selectedServicesFromForms: string[]
}

export function PricingSelectionTab({
  providerId,
  providerName,
  hasFormsSubmitted,
  clusters,
  selectedServicesFromForms,
}: PricingSelectionTabProps) {
  const [search, setSearch] = useState('')
  const [filteredClusters, setFilteredClusters] = useState(clusters)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [loadingServices, setLoadingServices] = useState<Set<string>>(new Set())
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [autoSelectTriggered, setAutoSelectTriggered] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Filter clusters by search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredClusters(clusters)
      return
    }

    const searchLower = search.toLowerCase()
    const filtered = clusters
      .map((cluster) => ({
        ...cluster,
        services: cluster.services.filter(
          (s) =>
            s.service_name.toLowerCase().includes(searchLower) ||
            s.unit_description.toLowerCase().includes(searchLower) ||
            (s.service_group && s.service_group.toLowerCase().includes(searchLower))
        ),
      }))
      .filter((cluster) => cluster.services.length > 0)

    setFilteredClusters(filtered)
  }, [search, clusters])

  // Calculate statistics
  const totalServices = clusters.reduce((sum, c) => sum + c.services.length, 0)
  const selectedServices = clusters.reduce(
    (sum, c) => sum + c.services.filter((s) => s.provider_price?.is_selected_for_proposal).length,
    0
  )
  const customPrices = clusters.reduce(
    (sum, c) => sum + c.services.filter((s) => s.provider_price?.custom_price_without_vat !== null).length,
    0
  )

  // Auto-select services from forms on first load
  useEffect(() => {
    // Only trigger once and only if there are services from forms AND no services are currently selected
    if (
      !autoSelectTriggered &&
      selectedServicesFromForms.length > 0 &&
      selectedServices === 0 &&
      hasFormsSubmitted
    ) {
      setAutoSelectTriggered(true)
      startTransition(async () => {
        const result = await autoSelectServicesFromForms(providerId, selectedServicesFromForms)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(`${result.count} serviços pré-selecionados automaticamente`)
          router.refresh()
        }
      })
    }
  }, [
    autoSelectTriggered,
    selectedServicesFromForms,
    selectedServices,
    hasFormsSubmitted,
    providerId,
    router,
  ])

  // Show forms not submitted message
  if (!hasFormsSubmitted) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Aguardando submissão do formulário de serviços</h3>
          <p className="text-sm text-muted-foreground">
            Os preços estarão disponíveis após o prestador submeter o formulário de serviços.
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleToggleService = async (referencePriceId: string, currentState: boolean) => {
    setLoadingServices((prev) => new Set(prev).add(referencePriceId))
    const result = await toggleServiceSelection(providerId, referencePriceId, !currentState)
    setLoadingServices((prev) => {
      const next = new Set(prev)
      next.delete(referencePriceId)
      return next
    })

    if (result.error) {
      alert(result.error)
    } else {
      setSuccessMessage('Seleção atualizada')
      setTimeout(() => setSuccessMessage(null), 2000)
    }
  }

  const handleToggleCluster = async (cluster: string) => {
    const clusterData = clusters.find((c) => c.cluster === cluster)
    if (!clusterData) return

    const serviceIds = clusterData.services.map((s) => s.id)
    const allSelected = clusterData.services.every((s) => s.provider_price?.is_selected_for_proposal)

    const result = await bulkToggleServices(providerId, serviceIds, !allSelected)

    if (result.error) {
      alert(result.error)
    } else {
      setSuccessMessage(`Cluster "${cluster}" atualizado`)
      setTimeout(() => setSuccessMessage(null), 2000)
    }
  }

  const handleToggleGroup = async (groupServices: typeof clusters[0]['services']) => {
    const serviceIds = groupServices.map((s) => s.id)
    const allSelected = groupServices.every((s) => s.provider_price?.is_selected_for_proposal)

    const result = await bulkToggleServices(providerId, serviceIds, !allSelected)

    if (result.error) {
      alert(result.error)
    } else {
      setSuccessMessage('Grupo atualizado')
      setTimeout(() => setSuccessMessage(null), 2000)
    }
  }

  const handleSavePrice = async (referencePriceId: string) => {
    const numValue = priceValue.trim() === '' ? null : parseFloat(priceValue.replace(',', '.'))

    if (numValue !== null && (isNaN(numValue) || numValue < 0)) {
      alert('Preço inválido')
      return
    }

    const result = await updateCustomPrice(providerId, referencePriceId, numValue)

    if (result.error) {
      alert(result.error)
    } else {
      setEditingPrice(null)
      setPriceValue('')
      setSuccessMessage('Preço atualizado')
      setTimeout(() => setSuccessMessage(null), 2000)
    }
  }

  const startEditingPrice = (referencePriceId: string, currentPrice: number | null) => {
    setEditingPrice(referencePriceId)
    setPriceValue(currentPrice !== null ? currentPrice.toFixed(2) : '')
  }

  const cancelEditingPrice = () => {
    setEditingPrice(null)
    setPriceValue('')
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return `${price.toFixed(2)} €`
  }

  const handleGeneratePDF = () => {
    startTransition(async () => {
      try {
        const result = await generateProposalPDFData(providerId)

        if (result.error || !result.data) {
          toast.error(result.error || 'Erro ao gerar PDF')
          return
        }

        const html = generateProposalPDFHTML(result.data)

        // Create blob and open in new window
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const windowRef = window.open(url, '_blank')

        if (windowRef) {
          // Allow the window to load before printing
          setTimeout(() => {
            windowRef.print()
          }, 500)
          toast.success('PDF gerado com sucesso')
        } else {
          toast.error('Não foi possível abrir a janela de impressão')
        }
      } catch (error) {
        console.error('Erro ao gerar PDF:', error)
        toast.error('Erro ao gerar proposta em PDF')
      }
    })
  }

  const getClusterColor = (c: string) => {
    switch (c) {
      case 'Casa':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Saúde e bem estar':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Empresas':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'Luxo':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
      case 'Pete':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Generate PDF button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Seleção de Preços</h3>
          <p className="text-sm text-muted-foreground">
            Selecione os serviços e defina preços customizados para {providerName}
          </p>
        </div>
        <Button onClick={handleGeneratePDF} disabled={selectedServices === 0 || isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              A gerar...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Gerar PDF
            </>
          )}
        </Button>
      </div>

      {/* Success message */}
      {successMessage && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total de Serviços</p>
            <p className="text-2xl font-bold">{totalServices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Selecionados</p>
            <p className="text-2xl font-bold text-green-600">{selectedServices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Preços Customizados</p>
            <p className="text-2xl font-bold text-blue-600">{customPrices}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar serviços..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Clusters Accordion */}
      <Accordion type="multiple" className="space-y-2">
        {filteredClusters.map((cluster) => {
          const clusterSelected = cluster.services.filter((s) => s.provider_price?.is_selected_for_proposal)
            .length
          const allSelected =
            cluster.services.length > 0 &&
            cluster.services.every((s) => s.provider_price?.is_selected_for_proposal)

          return (
            <AccordionItem key={cluster.cluster} value={cluster.cluster} className="border rounded-lg">
              <div className="px-4 flex items-center gap-3 py-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => handleToggleCluster(cluster.cluster)}
                />
                <AccordionTrigger className="flex-1 hover:no-underline py-0">
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant="secondary" className={getClusterColor(cluster.cluster)}>
                      {cluster.cluster}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {clusterSelected} / {cluster.services.length} selecionados
                    </span>
                  </div>
                </AccordionTrigger>
              </div>
              <AccordionContent className="px-4 pb-4">
                {(() => {
                  // Group services by service_group
                  const servicesByGroup = cluster.services.reduce((acc: Record<string, typeof cluster.services>, service) => {
                    const group = service.service_group || 'Outros'
                    if (!acc[group]) acc[group] = []
                    acc[group].push(service)
                    return acc
                  }, {})

                  return (
                    <div className="space-y-2">
                      {Object.entries(servicesByGroup).map(([groupName, groupServices]) => {
                        const groupSelectedCount = groupServices.filter(
                          (s) => s.provider_price?.is_selected_for_proposal
                        ).length

                        const allGroupSelected = groupServices.every((s) => s.provider_price?.is_selected_for_proposal)

                        return (
                          <Collapsible key={groupName} defaultOpen>
                            <div className="border rounded-lg">
                              <div className="px-4 py-3 flex items-center gap-2">
                                <Checkbox
                                  checked={allGroupSelected}
                                  onCheckedChange={() => handleToggleGroup(groupServices)}
                                />
                                <CollapsibleTrigger className="flex-1 flex items-center justify-between hover:bg-muted/50 transition-colors py-0">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {groupName}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {groupSelectedCount} / {groupServices.length} selecionados
                                    </span>
                                  </div>
                                  <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                                </CollapsibleTrigger>
                              </div>
                              <CollapsibleContent>
                                <div className="border-t">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[50px]">Sel.</TableHead>
                                        <TableHead>Serviço</TableHead>
                                        <TableHead>Unidade/Variante</TableHead>
                                        <TableHead className="text-right">IVA</TableHead>
                                        <TableHead className="text-right">Preço Ref.</TableHead>
                                        <TableHead className="text-right">Preço Custom</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {groupServices.map((service) => {
                        const isSelected = service.provider_price?.is_selected_for_proposal || false
                        const customPrice = service.provider_price?.custom_price_without_vat || null
                        const isEditing = editingPrice === service.id
                        const isLoading = loadingServices.has(service.id)

                        // Determine which price to use
                        const referencePrice = service.price_base || service.price_hour_with_materials
                        const finalPrice = customPrice !== null ? customPrice : referencePrice

                        return (
                          <TableRow key={service.id}>
                            <TableCell>
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleService(service.id, isSelected)}
                                />
                              )}
                            </TableCell>
                            <TableCell className="font-medium max-w-[250px]">
                              <div className="truncate">{service.service_name}</div>
                            </TableCell>
                            <TableCell className="text-sm max-w-[180px]">
                              <div className="truncate">
                                {service.unit_description}
                                {service.typology && (
                                  <span className="text-muted-foreground ml-1">({service.typology})</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{service.vat_rate}%</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatPrice(referencePrice)}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex items-center gap-2 justify-end">
                                  <Input
                                    type="text"
                                    value={priceValue}
                                    onChange={(e) => setPriceValue(e.target.value)}
                                    placeholder="0.00"
                                    className="w-24 h-8 text-right"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSavePrice(service.id)
                                      } else if (e.key === 'Escape') {
                                        cancelEditingPrice()
                                      }
                                    }}
                                  />
                                  <Button size="sm" onClick={() => handleSavePrice(service.id)}>
                                    Guardar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditingPrice}>
                                    Cancelar
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditingPrice(service.id, customPrice)}
                                  className={
                                    customPrice !== null ? 'font-medium text-blue-600' : 'text-muted-foreground'
                                  }
                                >
                                  {formatPrice(finalPrice)}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                                        )
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        )
                      })}
                    </div>
                  )
                })()}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {filteredClusters.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum serviço encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
