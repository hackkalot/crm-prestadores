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
import { Download, Loader2, History, Users, Cloud, Monitor } from 'lucide-react'

export function SyncProvidersDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isProduction, setIsProduction] = useState(false)

  // Detect environment on client side
  useEffect(() => {
    setIsProduction(
      typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
    )
  }, [])

  const handleSync = async () => {
    setLoading(true)
    setOpen(false)

    // Use different endpoint based on environment
    const apiEndpoint = isProduction
      ? '/api/sync/providers-github-actions'
      : '/api/sync/providers'

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
          console.error('Provider sync failed:', data.error)
        } else {
          console.log('Provider sync completed:', data)
          // Refresh the page to show updated data
          router.refresh()
        }
      })
      .catch((error) => {
        console.error('Provider sync error:', error)
      })
      .finally(() => {
        setLoading(false)
      })

    // Redirect to sync logs page immediately
    router.push('/configuracoes/sync-logs?tab=providers')
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" asChild title="Histórico de Sincronizações">
        <Link href="/configuracoes/sync-logs?tab=providers">
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
              <Users className="h-5 w-5" />
              Sincronizar Prestadores
            </DialogTitle>
            <DialogDescription>
              Importa todos os prestadores do backoffice OutSystems, incluindo
              estatísticas de pedidos e ratings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-semibold mb-2">O que será sincronizado:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Dados básicos (nome, email, telefone, NIF)</li>
                <li>Categorias e serviços</li>
                <li>Distritos e concelhos de cobertura</li>
                <li>Estatísticas de pedidos</li>
                <li>Ratings de serviço e técnico</li>
                <li>Status no backoffice</li>
              </ul>
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm dark:bg-amber-950/20 dark:border-amber-800">
              <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                Atenção:
              </p>
              <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                <li>O processo pode demorar 1-2 minutos</li>
                <li>Prestadores existentes serão atualizados</li>
                <li>Novos prestadores serão criados</li>
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
