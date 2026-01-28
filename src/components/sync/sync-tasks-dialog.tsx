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
import { ClipboardList, Loader2, History } from 'lucide-react'

export function SyncTasksDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSync = async () => {
    setLoading(true)
    setOpen(false)

    // Determine which API to use based on environment
    // In production (Vercel), use GitHub Actions
    // In development (localhost), use local Puppeteer
    const isProduction =
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost')
    const apiEndpoint = isProduction
      ? '/api/sync/tasks-github-actions'
      : '/api/sync/tasks'

    console.log(
      `Using tasks sync endpoint: ${apiEndpoint} (production: ${isProduction})`
    )

    // Start the sync in background (don't await - let it run)
    fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          console.error('Tasks sync failed:', data.error)
          alert(`Erro na sincronizacao: ${data.error}`)
        }
      })
      .catch((error) => {
        console.error('Tasks sync error:', error)
        alert('Erro ao iniciar sincronizacao de tarefas')
      })
      .finally(() => {
        setLoading(false)
      })

    // Redirect to sync logs page immediately - the realtime component will poll for updates
    router.push('/configuracoes/sync-logs?tab=tasks')
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        asChild
        title="Historico de Sincronizacoes"
      >
        <Link href="/configuracoes/sync-logs?tab=tasks">
          <History className="h-4 w-4" />
        </Link>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <ClipboardList className="h-4 w-4 mr-2" />
            Sincronizar Tarefas
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sincronizar Dados de Tarefas</DialogTitle>
            <DialogDescription>
              Extrai todas as tarefas do backoffice OutSystems.
              Este processo pode demorar alguns minutos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-semibold mb-1">Informação:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Exporta TODAS as tarefas registadas</li>
                <li>Limpa filtros de estado e utilizador</li>
                <li>O processo pode demorar 3-5 minutos</li>
                <li>Dados existentes serão atualizados</li>
                <li>Inclui informação de prestador, deadline e status</li>
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
                  <ClipboardList className="mr-2 h-4 w-4" />
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
