'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { FileText, Download, ChevronDown, Clock, User, Loader2, Plus } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import type { ServiceSheetSnapshot } from '@/lib/service-templates/actions'

interface ServiceSheetHistoryProps {
  snapshots: ServiceSheetSnapshot[]
  providerId: string
  providerName: string
  showGenerateButton?: boolean
}

export function ServiceSheetHistory({ snapshots, providerId, providerName, showGenerateButton = true }: ServiceSheetHistoryProps) {
  const router = useRouter()
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateNew = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/service-sheets?providerId=${providerId}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao gerar ficha de serviço')
      }

      const { html } = await response.json()

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

      // Revalidate to show new snapshot without full page refresh
      router.refresh()
    } catch (error) {
      console.error('Erro ao gerar ficha:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar ficha de serviço')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPDF = async (snapshotId: string) => {
    setLoadingPdfId(snapshotId)
    try {
      // Fetch HTML from API (regenerates the PDF)
      const response = await fetch(`/api/service-sheets?providerId=${providerId}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao gerar ficha de serviço')
      }

      const { html } = await response.json()

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

  if (snapshots.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fichas de Serviço
          </CardTitle>
          {showGenerateButton && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleGenerateNew}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Gerar Ficha
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma ficha gerada ainda</p>
            <p className="text-sm mt-1">
              Clique em &quot;Gerar Ficha&quot; para criar o documento PDF
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fichas de Serviço
          </CardTitle>
          <Badge variant="secondary">
            {snapshots.length} {snapshots.length === 1 ? 'versão' : 'versões'}
          </Badge>
        </div>
        {showGenerateButton && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleGenerateNew}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Gerar Nova Ficha
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Latest version - highlighted */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Badge variant="default">Última versão</Badge>
              <span className="font-medium">{latestSnapshot.snapshot_name}</span>
            </div>
            <Button
              size="sm"
              onClick={() => handleDownloadPDF(latestSnapshot.id)}
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
              {latestSnapshot.snapshot_data.templates_count} templates
            </Badge>
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
                    <TableHead className="text-right">Templates</TableHead>
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
                        {snapshot.snapshot_data.templates_count}
                      </TableCell>
                      <TableCell className="text-right">
                        {snapshot.snapshot_data.services_count}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadPDF(snapshot.id)}
                          disabled={loadingPdfId === snapshot.id}
                        >
                          {loadingPdfId === snapshot.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
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
