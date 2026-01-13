'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { Download, Loader2, History, GitBranch, Cloud, Monitor } from 'lucide-react'
import { Label } from '@/components/ui/label'

export function SyncAllocationDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isProduction, setIsProduction] = useState(false)

  // Default dates: last year to today
  const today = new Date()
  const oneYearAgo = new Date(today)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const [dateFrom, setDateFrom] = useState<Date | undefined>(oneYearAgo)
  const [dateTo, setDateTo] = useState<Date | undefined>(today)

  // Detect environment on client side
  useEffect(() => {
    setIsProduction(
      typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
    )
  }, [])

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const handleSync = async () => {
    if (!dateFrom || !dateTo) return

    setLoading(true)
    setOpen(false)

    // Use different endpoint based on environment
    const apiEndpoint = isProduction
      ? '/api/sync/allocation-history-github-actions'
      : '/api/sync/allocation-history'

    // Start the sync in background (don't await - let it run)
    fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateFrom: formatDate(dateFrom),
        dateTo: formatDate(dateTo),
      }),
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          console.error('Allocation history sync failed:', data.error)
        } else {
          console.log('Allocation history sync completed:', data)
          // Refresh the page to show updated data
          router.refresh()
        }
      })
      .catch((error) => {
        console.error('Allocation history sync error:', error)
      })
      .finally(() => {
        setLoading(false)
      })

    // Redirect to sync logs page immediately
    router.push('/configuracoes/sync-logs?tab=allocation')
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" asChild title="Histórico de Sincronizações">
        <Link href="/configuracoes/sync-logs?tab=allocation">
          <History className="h-4 w-4" />
        </Link>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Sincronizar Backoffice
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Sincronizar Histórico de Alocação
            </DialogTitle>
            <DialogDescription>
              Importa o histórico de alocação dos prestadores do backoffice OutSystems,
              incluindo pedidos recebidos, aceites, rejeitados e tempo médio de resposta.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Data De</Label>
                <DatePicker
                  value={dateFrom || null}
                  onChange={(date) => setDateFrom(date || undefined)}
                  placeholder="Selecionar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Data Até</Label>
                <DatePicker
                  value={dateTo || null}
                  onChange={(date) => setDateTo(date || undefined)}
                  placeholder="Selecionar"
                />
              </div>
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-semibold mb-2">O que será sincronizado:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Pedidos recebidos por prestador</li>
                <li>Pedidos aceites, rejeitados e expirados</li>
                <li>Tempo médio de resposta</li>
              </ul>
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm dark:bg-amber-950/20 dark:border-amber-800">
              <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                Atenção:
              </p>
              <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                <li>O processo pode demorar 1-2 minutos</li>
                <li>Registos existentes para o período serão atualizados</li>
              </ul>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isProduction ? (
                <>
                  <Cloud className="h-3 w-3" />
                  <span>Execução via GitHub Actions</span>
                </>
              ) : (
                <>
                  <Monitor className="h-3 w-3" />
                  <span>Execução local (Puppeteer)</span>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSync} disabled={loading || !dateFrom || !dateTo}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A sincronizar...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Iniciar Sincronização
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
