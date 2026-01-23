'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { FileText, Download, ChevronDown, Clock, User, Loader2, FileSpreadsheet } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { getSnapshotPDFData, type PricingSnapshot, type ProposalPDFPrice } from '@/lib/providers/pricing-actions'
import { generateCatalogPricePDFHTML } from '@/lib/service-catalog/pdf-generator'

interface PricingHistoryProps {
  snapshots: PricingSnapshot[]
  providerName: string
}

export function PricingHistory({ snapshots, providerName }: PricingHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null)
  const [loadingXlsxId, setLoadingXlsxId] = useState<string | null>(null)

  const handleDownloadPDF = async (snapshotId: string, snapshotName: string) => {
    setLoadingPdfId(snapshotId)
    try {
      const result = await getSnapshotPDFData(snapshotId)

      if (result.error || !result.data) {
        toast.error(result.error || 'Erro ao carregar snapshot')
        return
      }

      const html = generateCatalogPricePDFHTML(result.data.prices, result.data.provider)

      // Open in new tab and trigger print
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const windowRef = window.open(url, '_blank')

      if (windowRef) {
        windowRef.onload = () => {
          setTimeout(() => {
            windowRef.print()
          }, 500)
        }
      }

      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar PDF')
    } finally {
      setLoadingPdfId(null)
    }
  }

  const handleDownloadXLSX = async (snapshotId: string, snapshotName: string) => {
    setLoadingXlsxId(snapshotId)
    try {
      const result = await getSnapshotPDFData(snapshotId)

      if (result.error || !result.data) {
        toast.error(result.error || 'Erro ao carregar snapshot')
        return
      }

      // Generate XLSX using xlsx library
      const { utils, writeFile } = await import('xlsx')

      // Group prices by cluster for separate sheets
      const pricesByCluster = result.data.prices.reduce((acc, price) => {
        const cluster = price.cluster || 'Outros'
        if (!acc[cluster]) acc[cluster] = []
        acc[cluster].push(price)
        return acc
      }, {} as Record<string, ProposalPDFPrice[]>)

      // Create workbook
      const workbook = utils.book_new()

      // Add a sheet for each cluster
      for (const [cluster, prices] of Object.entries(pricesByCluster)) {
        const data = prices.map((p) => ({
          'Serviço': p.service_name,
          'Grupo': p.service_group || '-',
          'Unidade': p.unit_description,
          'Tipologia': p.typology || '-',
          'IVA (%)': p.vat_rate,
          'Preço s/IVA (€)': p.price_base,
          'Preço c/IVA (€)': p.price_base ? p.price_base * (1 + p.vat_rate / 100) : null,
        }))

        const worksheet = utils.json_to_sheet(data)

        // Auto-size columns
        const colWidths = [
          { wch: 40 }, // Serviço
          { wch: 20 }, // Grupo
          { wch: 20 }, // Unidade
          { wch: 15 }, // Tipologia
          { wch: 10 }, // IVA
          { wch: 15 }, // Preço s/IVA
          { wch: 15 }, // Preço c/IVA
        ]
        worksheet['!cols'] = colWidths

        // Sanitize sheet name (max 31 chars, no special chars)
        const sheetName = cluster.substring(0, 31).replace(/[\\/*?:[\]]/g, '')
        utils.book_append_sheet(workbook, worksheet, sheetName)
      }

      // Add summary sheet
      const summaryData = [
        { 'Campo': 'Prestador', 'Valor': result.data.provider.name },
        { 'Campo': 'NIF', 'Valor': result.data.provider.nif || '-' },
        { 'Campo': 'Email', 'Valor': result.data.provider.email || '-' },
        { 'Campo': 'Total Serviços', 'Valor': result.data.prices.length },
        { 'Campo': 'Data Proposta', 'Valor': snapshotName },
      ]
      const summarySheet = utils.json_to_sheet(summaryData)
      summarySheet['!cols'] = [{ wch: 20 }, { wch: 50 }]
      utils.book_append_sheet(workbook, summarySheet, 'Resumo')

      // Generate filename
      const filename = `proposta_${providerName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`

      // Download
      writeFile(workbook, filename)
      toast.success('XLSX descarregado com sucesso')
    } catch (error) {
      console.error('Erro ao gerar XLSX:', error)
      toast.error('Erro ao gerar XLSX')
    } finally {
      setLoadingXlsxId(null)
    }
  }

  if (snapshots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Propostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma proposta gerada ainda</p>
            <p className="text-sm mt-1">
              As propostas geradas aparecerão aqui automaticamente
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get the latest snapshot
  const latestSnapshot = snapshots[0]
  const olderSnapshots = snapshots.slice(1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Histórico de Propostas
          <Badge variant="secondary" className="ml-2">
            {snapshots.length} {snapshots.length === 1 ? 'versão' : 'versões'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Latest version - highlighted */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Badge variant="default">Última versão</Badge>
              <span className="font-medium">{latestSnapshot.snapshot_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadXLSX(latestSnapshot.id, latestSnapshot.snapshot_name || '')}
                disabled={loadingXlsxId === latestSnapshot.id}
              >
                {loadingXlsxId === latestSnapshot.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    XLSX
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => handleDownloadPDF(latestSnapshot.id, latestSnapshot.snapshot_name || '')}
                disabled={loadingPdfId === latestSnapshot.id}
              >
                {loadingPdfId === latestSnapshot.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDateTime(latestSnapshot.created_at)}
            </div>
            {latestSnapshot.created_by_user && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {latestSnapshot.created_by_user.name}
              </div>
            )}
            <Badge variant="outline">
              {latestSnapshot.snapshot_data.services_count} serviços
            </Badge>
          </div>
        </div>

        {/* Older versions - collapsible */}
        {olderSnapshots.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="text-sm text-muted-foreground">
                  {olderSnapshots.length} versões anteriores
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Gerado por</TableHead>
                    <TableHead className="text-right">Serviços</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {olderSnapshots.map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{snapshot.snapshot_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(snapshot.created_at)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {snapshot.created_by_user?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {snapshot.snapshot_data.services_count}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadXLSX(snapshot.id, snapshot.snapshot_name || '')}
                            disabled={loadingXlsxId === snapshot.id}
                          >
                            {loadingXlsxId === snapshot.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadPDF(snapshot.id, snapshot.snapshot_name || '')}
                            disabled={loadingPdfId === snapshot.id}
                          >
                            {loadingPdfId === snapshot.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
