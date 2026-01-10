'use client'

import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Download, Loader2, History, AlertTriangle } from 'lucide-react'

// Helper to parse dd-mm-yyyy to Date
function parseDDMMYYYY(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

// Calculate days between two dates
function daysBetween(from: string, to: string): number | null {
  const fromDate = parseDDMMYYYY(from)
  const toDate = parseDDMMYYYY(to)
  if (!fromDate || !toDate) return null
  const diffTime = toDate.getTime() - fromDate.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function SyncBackofficeDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Check if period is longer than 14 days
  const periodDays = daysBetween(dateFrom, dateTo)
  const isLongPeriod = periodDays !== null && periodDays > 14

  // Set default dates (last 7 days)
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !dateFrom && !dateTo) {
      const today = new Date()
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

      setDateTo(formatDateToDDMMYYYY(today))
      setDateFrom(formatDateToDDMMYYYY(weekAgo))
    }
    setOpen(isOpen)
  }

  const handleSync = async () => {
    if (!dateFrom || !dateTo) {
      alert('Por favor preencha ambas as datas')
      return
    }

    setLoading(true)
    setOpen(false)

    // Start the sync in background (don't await - let it run)
    fetch('/api/sync/backoffice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateFrom,
        dateTo,
      }),
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          console.error('Sync failed:', data.error)
        }
      })
      .catch((error) => {
        console.error('Sync error:', error)
      })
      .finally(() => {
        setLoading(false)
      })

    // Redirect to sync logs page immediately - the realtime component will poll for updates
    router.push('/configuracoes/sync-logs')
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" asChild title="Histórico de Sincronizações">
        <Link href="/configuracoes/sync-logs">
          <History className="h-4 w-4" />
        </Link>
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Sincronizar Backoffice
          </Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sincronizar Dados do Backoffice</DialogTitle>
          <DialogDescription>
            Extrai dados do backoffice OutSystems para o período selecionado.
            Este processo pode demorar alguns minutos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="dateFrom">Data Início</Label>
            <Input
              id="dateFrom"
              type="text"
              placeholder="dd-mm-aaaa"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Formato: dd-mm-aaaa (ex: 01-01-2026)
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dateTo">Data Fim</Label>
            <Input
              id="dateTo"
              type="text"
              placeholder="dd-mm-aaaa"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Formato: dd-mm-aaaa (ex: 09-01-2026)
            </p>
          </div>

          {isLongPeriod && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm dark:bg-amber-950/20 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Período longo ({periodDays} dias)
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Períodos superiores a 2 semanas podem demorar mais de 5 minutos.
                    Recomendamos dividir em períodos mais curtos para melhor performance.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-semibold mb-1">Atenção:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>O processo pode demorar {isLongPeriod ? '5-10' : '1-3'} minutos</li>
              <li>Dados existentes serão atualizados</li>
            </ul>
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
          <Button onClick={handleSync} disabled={loading}>
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

// Helper to format Date to dd-mm-yyyy
function formatDateToDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}
