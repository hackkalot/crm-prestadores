'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  AlertTriangle,
  Check,
  Edit2,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Camera,
  Sparkles,
  Download,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { setProviderPrice, createPriceSnapshot, generateInitialPriceProposal } from '@/lib/pricing/actions'
import { generatePricingProposalHTML } from '@/lib/providers/pdf-actions'
import { cn, formatCurrency } from '@/lib/utils'

interface ServiceCategory {
  id: string
  name: string
  cluster: string | null
  vat_rate: number
  is_active: boolean
}

interface ReferencePrice {
  id: string
  service_id: string
  variant_name: string | null
  variant_description: string | null
  price_without_vat: number
  valid_from: string
  is_active: boolean
}

interface ProviderPrice {
  id: string
  provider_id: string
  service_id: string
  variant_name: string | null
  price_without_vat: number
  valid_from: string
  is_active: boolean
}

interface ServiceWithPrices {
  id: string
  name: string
  description: string | null
  unit: string | null
  is_active: boolean
  category: ServiceCategory
  reference_prices: ReferencePrice[]
  provider_prices: ProviderPrice[]
}

interface PricingTableProps {
  providerId: string
  providerName?: string
  data: Array<{
    category: ServiceCategory
    services: ServiceWithPrices[]
  }>
  deviationThreshold: number
}

export function PricingTable({ providerId, providerName, data, deviationThreshold }: PricingTableProps) {
  const [isPending, startTransition] = useTransition()
  const [editingPrice, setEditingPrice] = useState<{
    serviceId: string
    variantName: string | null
    value: string
  } | null>(null)
  const router = useRouter()

  // Verificar se ha precos definidos
  const hasAnyPrices = data.some(({ services }) =>
    services.some((s) => s.provider_prices.length > 0)
  )

  // Exportar tabela de precos como CSV
  const handleExportCSV = () => {
    const rows: string[][] = []

    // Cabecalho
    rows.push(['Categoria', 'Servico', 'Variante', 'Preco Referencia (EUR)', 'Preco Acordado (EUR)', 'Desvio (%)'])

    // Dados
    for (const { category, services } of data) {
      for (const service of services) {
        if (service.reference_prices.length > 0) {
          for (const refPrice of service.reference_prices) {
            const providerPrice = service.provider_prices.find(
              (pp) => pp.variant_name === refPrice.variant_name
            )
            const deviation = providerPrice
              ? (((providerPrice.price_without_vat - refPrice.price_without_vat) / refPrice.price_without_vat) * 100).toFixed(1)
              : '-'

            rows.push([
              category.name,
              service.name,
              refPrice.variant_name || '-',
              refPrice.price_without_vat.toFixed(2),
              providerPrice ? providerPrice.price_without_vat.toFixed(2) : '-',
              deviation,
            ])
          }
        } else {
          rows.push([category.name, service.name, '-', '-', '-', '-'])
        }
      }
    }

    // Converter para CSV
    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

    // Criar blob e download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `precario_${providerName?.replace(/\s+/g, '_') || providerId}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('Tabela de precos exportada')
  }

  const handleGenerateProposal = () => {
    startTransition(async () => {
      const result = await generateInitialPriceProposal(providerId)
      if (result.success) {
        toast.success(`Proposta gerada com ${result.pricesCreated} precos`)
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao gerar proposta')
      }
    })
  }

  const handleSavePrice = (serviceId: string, variantName: string | null) => {
    if (!editingPrice) return

    const newPrice = parseFloat(editingPrice.value.replace(',', '.'))
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error('Preco invalido')
      return
    }

    startTransition(async () => {
      try {
        await setProviderPrice(providerId, serviceId, newPrice, variantName)
        toast.success('Preço atualizado')
        setEditingPrice(null)
      } catch (error) {
        toast.error('Erro ao atualizar preço')
      }
    })
  }

  const handleCreateSnapshot = () => {
    startTransition(async () => {
      try {
        await createPriceSnapshot(providerId)
        toast.success('Snapshot criado com sucesso')
      } catch (error) {
        toast.error('Erro ao criar snapshot')
      }
    })
  }

  const handleGeneratePDF = () => {
    try {
      const html = generatePricingProposalHTML(
        {
          id: providerId,
          name: providerName || 'Prestador',
          nif: null,
          email: '',
        },
        data
      )

      // Create blob and open in new window
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const window_ref = window.open(url, '_blank')

      if (window_ref) {
        // Allow the window to load before printing
        setTimeout(() => {
          window_ref.print()
        }, 500)
      } else {
        toast.error('Não foi possível abrir a janela de impressão')
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar proposta em PDF')
    }
  }

  const calculateDeviation = (providerPrice: number, referencePrice: number) => {
    return ((providerPrice - referencePrice) / referencePrice) * 100
  }

  const getDeviationBadge = (deviation: number) => {
    const absDeviation = Math.abs(deviation)
    if (absDeviation <= 5) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Minus className="h-3 w-3" />
          {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
        </Badge>
      )
    }
    if (absDeviation > deviationThreshold * 100) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
        </Badge>
      )
    }
    if (deviation > 0) {
      return (
        <Badge variant="warning" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          +{deviation.toFixed(1)}%
        </Badge>
      )
    }
    return (
      <Badge variant="success" className="gap-1">
        <TrendingDown className="h-3 w-3" />
        {deviation.toFixed(1)}%
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Tabela de Precos</h3>
          <p className="text-sm text-muted-foreground">
            Comparacao com precos de referencia FIXO
          </p>
        </div>
        <div className="flex gap-2">
          {!hasAnyPrices && (
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerateProposal}
              disabled={isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Proposta Inicial
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePDF}
            disabled={!hasAnyPrices}
            title="Gerar e imprimir proposta em PDF"
          >
            <FileText className="h-4 w-4 mr-2" />
            Proposta PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateSnapshot}
            disabled={isPending || !hasAnyPrices}
          >
            <Camera className="h-4 w-4 mr-2" />
            Guardar Snapshot
          </Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={data.map((d) => d.category.id)} className="space-y-2">
        {data.map(({ category, services }) => (
          <AccordionItem
            key={category.id}
            value={category.id}
            className="border rounded-lg"
          >
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="font-medium">{category.name}</span>
                <Badge variant="outline" className="text-xs">
                  {services.length} servicos
                </Badge>
                {category.cluster && (
                  <Badge variant="secondary" className="text-xs">
                    {category.cluster}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Servico</TableHead>
                    <TableHead className="text-right">Referencia</TableHead>
                    <TableHead className="text-right">Acordado</TableHead>
                    <TableHead className="text-right">Desvio</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => {
                    // Se tem variantes, mostrar linha por variante
                    if (service.reference_prices.length > 1 || service.reference_prices.some(rp => rp.variant_name)) {
                      return service.reference_prices.map((refPrice) => {
                        const providerPrice = service.provider_prices.find(
                          (pp) => pp.variant_name === refPrice.variant_name
                        )
                        const isEditing =
                          editingPrice?.serviceId === service.id &&
                          editingPrice?.variantName === refPrice.variant_name

                        const deviation = providerPrice
                          ? calculateDeviation(providerPrice.price_without_vat, refPrice.price_without_vat)
                          : null

                        return (
                          <TableRow key={`${service.id}-${refPrice.variant_name || 'default'}`}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{service.name}</span>
                                {refPrice.variant_name && (
                                  <span className="text-muted-foreground ml-1">
                                    ({refPrice.variant_name})
                                  </span>
                                )}
                              </div>
                              {refPrice.variant_description && (
                                <p className="text-xs text-muted-foreground">
                                  {refPrice.variant_description}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(refPrice.price_without_vat)}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="text"
                                  value={editingPrice.value}
                                  onChange={(e) =>
                                    setEditingPrice({ ...editingPrice, value: e.target.value })
                                  }
                                  className="w-24 text-right h-8"
                                  autoFocus
                                />
                              ) : providerPrice ? (
                                formatCurrency(providerPrice.price_without_vat)
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {deviation !== null && getDeviationBadge(deviation)}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      handleSavePrice(service.id, refPrice.variant_name)
                                    }
                                    disabled={isPending}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setEditingPrice(null)}
                                    disabled={isPending}
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() =>
                                    setEditingPrice({
                                      serviceId: service.id,
                                      variantName: refPrice.variant_name,
                                      value: providerPrice?.price_without_vat.toString() || '',
                                    })
                                  }
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    }

                    // Servico simples sem variantes
                    const refPrice = service.reference_prices[0]
                    const providerPrice = service.provider_prices[0]
                    const isEditing =
                      editingPrice?.serviceId === service.id &&
                      editingPrice?.variantName === null

                    const deviation =
                      refPrice && providerPrice
                        ? calculateDeviation(providerPrice.price_without_vat, refPrice.price_without_vat)
                        : null

                    return (
                      <TableRow key={service.id}>
                        <TableCell>
                          <div className="font-medium">{service.name}</div>
                          {service.description && (
                            <p className="text-xs text-muted-foreground">
                              {service.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {refPrice ? formatCurrency(refPrice.price_without_vat) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={editingPrice.value}
                              onChange={(e) =>
                                setEditingPrice({ ...editingPrice, value: e.target.value })
                              }
                              className="w-24 text-right h-8"
                              autoFocus
                            />
                          ) : providerPrice ? (
                            formatCurrency(providerPrice.price_without_vat)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {deviation !== null && getDeviationBadge(deviation)}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleSavePrice(service.id, null)}
                                disabled={isPending}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => setEditingPrice(null)}
                                disabled={isPending}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                setEditingPrice({
                                  serviceId: service.id,
                                  variantName: null,
                                  value: providerPrice?.price_without_vat.toString() || '',
                                })
                              }
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {data.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum servico configurado
          </CardContent>
        </Card>
      )}
    </div>
  )
}
