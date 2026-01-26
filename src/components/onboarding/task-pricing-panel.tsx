'use client'

import { useState, useEffect, useTransition } from 'react'
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
import { Search, FileText, CheckCircle2, Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  updateCustomPrice,
  generateProposalPDFData,
  savePricingSnapshot,
  type PricingCluster,
  type PricingService,
} from '@/lib/providers/pricing-actions'
import { generateCatalogPricePDFHTML } from '@/lib/service-catalog/pdf-generator'

interface TaskPricingPanelProps {
  providerId: string
  providerName: string
  clusters: PricingCluster[]
  providerServices: string[] // UUIDs dos serviços do provider.services (pre-selected)
}

export function TaskPricingPanel({
  providerId,
  providerName,
  clusters,
  providerServices,
}: TaskPricingPanelProps) {
  const [search, setSearch] = useState('')
  const [filteredClusters, setFilteredClusters] = useState(clusters)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Local state for selected services (initialized from provider.services)
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(() => new Set(providerServices))

  // Local state for custom prices (track changes before saving)
  const [localCustomPrices, setLocalCustomPrices] = useState<Map<string, number | null>>(() => {
    const map = new Map<string, number | null>()
    for (const cluster of clusters) {
      for (const service of cluster.services) {
        if (service.custom_price != null) {
          map.set(service.id, service.custom_price)
        }
      }
    }
    return map
  })

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
  const selectedCount = selectedServiceIds.size
  const customPricesCount = localCustomPrices.size

  // Toggle single service selection (local state only)
  const handleToggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev)
      if (next.has(serviceId)) {
        next.delete(serviceId)
      } else {
        next.add(serviceId)
      }
      return next
    })
  }

  // Toggle all services in a cluster (local state only)
  const handleToggleCluster = (cluster: PricingCluster) => {
    const clusterServiceIds = cluster.services.map((s) => s.id)
    const allSelected = clusterServiceIds.every((id) => selectedServiceIds.has(id))

    setSelectedServiceIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        // Deselect all in cluster
        for (const id of clusterServiceIds) {
          next.delete(id)
        }
      } else {
        // Select all in cluster
        for (const id of clusterServiceIds) {
          next.add(id)
        }
      }
      return next
    })
  }

  // Toggle all services in a group (local state only)
  const handleToggleGroup = (groupServices: PricingService[]) => {
    const groupServiceIds = groupServices.map((s) => s.id)
    const allSelected = groupServiceIds.every((id) => selectedServiceIds.has(id))

    setSelectedServiceIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const id of groupServiceIds) {
          next.delete(id)
        }
      } else {
        for (const id of groupServiceIds) {
          next.add(id)
        }
      }
      return next
    })
  }

  // Save custom price to DB
  const handleSavePrice = async (serviceId: string) => {
    const numValue = priceValue.trim() === '' ? null : parseFloat(priceValue.replace(',', '.'))

    if (numValue !== null && (isNaN(numValue) || numValue < 0)) {
      toast.error('Preço inválido')
      return
    }

    setSavingPriceId(serviceId)
    const result = await updateCustomPrice(providerId, serviceId, numValue)
    setSavingPriceId(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      // Update local state
      if (numValue === null) {
        setLocalCustomPrices((prev) => {
          const next = new Map(prev)
          next.delete(serviceId)
          return next
        })
      } else {
        setLocalCustomPrices((prev) => new Map(prev).set(serviceId, numValue))
      }
      setEditingPrice(null)
      setPriceValue('')
      setSuccessMessage('Preço atualizado')
      setTimeout(() => setSuccessMessage(null), 2000)
    }
  }

  const startEditingPrice = (serviceId: string, currentCustomPrice: number | null, referencePrice: number | null) => {
    setEditingPrice(serviceId)
    // Show custom price if exists, otherwise show reference price for editing
    const priceToEdit = currentCustomPrice ?? referencePrice
    setPriceValue(priceToEdit !== null ? priceToEdit.toFixed(2) : '')
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
    const selectedIds = Array.from(selectedServiceIds)

    startTransition(async () => {
      try {
        const result = await generateProposalPDFData(providerId, selectedIds)

        if (result.error || !result.data) {
          toast.error(result.error || 'Erro ao gerar PDF')
          return
        }

        // Save snapshot before generating PDF
        const snapshotResult = await savePricingSnapshot(providerId, result.data)
        if (snapshotResult.error) {
          console.error('Error saving snapshot:', snapshotResult.error)
          // Continue with PDF generation even if snapshot fails
        }

        // Use the new PDF generator with grouped tables
        // Pass materials if present (when Canalizador is selected)
        const html = generateCatalogPricePDFHTML(result.data.prices, result.data.provider, result.data.materials)

        // Open in new tab and trigger print
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const windowRef = window.open(url, '_blank')

        if (windowRef) {
          // Wait for window to load then trigger print
          windowRef.onload = () => {
            setTimeout(() => {
              windowRef.print()
            }, 500)
          }
        }

        // Clean up the blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 60000)

        // Refresh the page to show the new snapshot in the Preços tab
        router.refresh()
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
    <div className="space-y-4">
      {/* Header with stats and PDF button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Total:</span>{' '}
            <span className="font-medium">{totalServices}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Selecionados:</span>{' '}
            <span className="font-medium text-green-600">{selectedCount}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Preços Custom:</span>{' '}
            <span className="font-medium text-blue-600">{customPricesCount}</span>
          </div>
        </div>
        <Button onClick={handleGeneratePDF} disabled={selectedCount === 0 || isPending} size="sm">
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
        <Alert className="py-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar serviços..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Clusters Accordion */}
      <Accordion type="multiple" className="space-y-2">
        {filteredClusters.map((cluster) => {
          const clusterServiceIds = cluster.services.map((s) => s.id)
          const clusterSelectedCount = clusterServiceIds.filter((id) => selectedServiceIds.has(id)).length
          const allClusterSelected = clusterServiceIds.length > 0 && clusterServiceIds.every((id) => selectedServiceIds.has(id))

          return (
            <AccordionItem key={cluster.cluster} value={cluster.cluster} className="border rounded-lg">
              <div className="px-3 flex items-center gap-2 py-3">
                <Checkbox
                  checked={allClusterSelected}
                  onCheckedChange={() => handleToggleCluster(cluster)}
                />
                <AccordionTrigger className="flex-1 hover:no-underline py-0">
                  <div className="flex items-center gap-2 flex-1">
                    <Badge variant="secondary" className={`text-xs ${getClusterColor(cluster.cluster)}`}>
                      {cluster.cluster}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {clusterSelectedCount} / {cluster.services.length}
                    </span>
                  </div>
                </AccordionTrigger>
              </div>
              <AccordionContent className="px-3 pb-3">
                {(() => {
                  // Group services by service_group
                  const servicesByGroup = cluster.services.reduce((acc: Record<string, PricingService[]>, service) => {
                    const group = service.service_group || 'Outros'
                    if (!acc[group]) acc[group] = []
                    acc[group].push(service)
                    return acc
                  }, {})

                  return (
                    <div className="space-y-2">
                      {Object.entries(servicesByGroup).map(([groupName, groupServices]) => {
                        const groupServiceIds = groupServices.map((s) => s.id)
                        const groupSelectedCount = groupServiceIds.filter((id) => selectedServiceIds.has(id)).length
                        const allGroupSelected = groupServices.every((s) => selectedServiceIds.has(s.id))

                        return (
                          <Collapsible key={groupName} defaultOpen>
                            <div className="border rounded-lg">
                              <div className="px-3 py-2 flex items-center gap-2">
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
                                      {groupSelectedCount} / {groupServices.length}
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
                                        <TableHead className="w-[40px]">Sel.</TableHead>
                                        <TableHead>Serviço</TableHead>
                                        <TableHead>Unidade</TableHead>
                                        <TableHead className="text-right w-[70px]">IVA</TableHead>
                                        <TableHead className="text-right w-[90px]">Preço Ref.</TableHead>
                                        <TableHead className="text-right w-[120px]">Preço Custom</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {groupServices.map((service) => {
                                        const isSelected = selectedServiceIds.has(service.id)
                                        const customPrice = localCustomPrices.get(service.id) ?? null
                                        const isEditing = editingPrice === service.id
                                        const isSaving = savingPriceId === service.id
                                        const isFromProviderServices = providerServices.includes(service.id)

                                        // Determine which price to use
                                        const referencePrice = service.price_base || service.price_hour_with_materials
                                        const finalPrice = customPrice !== null ? customPrice : referencePrice

                                        return (
                                          <TableRow
                                            key={service.id}
                                            className={isFromProviderServices && !isSelected ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}
                                          >
                                            <TableCell>
                                              <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggleService(service.id)}
                                              />
                                            </TableCell>
                                            <TableCell className="font-medium max-w-[180px]">
                                              <div className="truncate text-sm">{service.service_name}</div>
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[140px]">
                                              <div className="truncate">
                                                {service.unit_description}
                                                {service.typology && (
                                                  <span className="text-muted-foreground ml-1">({service.typology})</span>
                                                )}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right text-xs">{service.vat_rate}%</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                              {formatPrice(referencePrice)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {isEditing ? (
                                                <div className="flex items-center gap-1 justify-end">
                                                  <Input
                                                    type="text"
                                                    value={priceValue}
                                                    onChange={(e) => setPriceValue(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-16 h-7 text-right text-xs"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                        handleSavePrice(service.id)
                                                      } else if (e.key === 'Escape') {
                                                        cancelEditingPrice()
                                                      }
                                                    }}
                                                  />
                                                  <Button
                                                    size="sm"
                                                    className="h-7 text-xs px-2"
                                                    onClick={() => handleSavePrice(service.id)}
                                                    disabled={isSaving}
                                                  >
                                                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'OK'}
                                                  </Button>
                                                  <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={cancelEditingPrice}>
                                                    X
                                                  </Button>
                                                </div>
                                              ) : (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className={`h-7 text-xs ${
                                                    customPrice !== null ? 'font-medium text-blue-600' : 'text-muted-foreground'
                                                  }`}
                                                  onClick={() => startEditingPrice(service.id, customPrice, referencePrice)}
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
          <CardContent className="p-6 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum serviço encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
