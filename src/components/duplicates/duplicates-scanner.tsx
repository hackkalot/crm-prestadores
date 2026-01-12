'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { scanForDuplicates, quickMergeExactDuplicates, type DuplicateGroup, type DuplicateScanResult } from '@/lib/duplicates/actions'
import { MergeDialog } from './merge-dialog'
import { Search, Users, Mail, CreditCard, Type, AlertTriangle, CheckCircle2, Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'

const matchTypeIcons = {
  email: Mail,
  nif: CreditCard,
  name: Type,
}

const matchTypeLabels = {
  email: 'Email',
  nif: 'NIF',
  name: 'Nome',
}

const matchTypeColors = {
  email: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  nif: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  name: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
}

export function DuplicatesScanner() {
  const [isPending, startTransition] = useTransition()
  const [isQuickMerging, startQuickMerge] = useTransition()
  const [result, setResult] = useState<DuplicateScanResult | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null)
  const [selectedProviders, setSelectedProviders] = useState<{ a: string; b: string } | null>(null)
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)

  const handleScan = () => {
    startTransition(async () => {
      try {
        const scanResult = await scanForDuplicates()
        setResult(scanResult)
        if (scanResult.groups.length === 0) {
          toast.success('Nenhum duplicado encontrado!')
        } else {
          toast.info(`Encontrados ${scanResult.totalDuplicates} potenciais duplicados em ${scanResult.groups.length} grupos`)
        }
      } catch (error) {
        toast.error('Erro ao procurar duplicados')
      }
    })
  }

  // Count exact match duplicates (email + NIF only) for quick merge button
  const exactMatchCount = result
    ? result.groups
        .filter(g => g.matchType === 'email' || g.matchType === 'nif')
        .reduce((acc, g) => acc + g.providers.length - 1, 0)
    : 0

  const handleQuickMerge = () => {
    if (exactMatchCount === 0) {
      toast.info('Não há duplicados exatos (email/NIF) para fundir automaticamente')
      return
    }

    startQuickMerge(async () => {
      try {
        const result = await quickMergeExactDuplicates()
        if (result.success) {
          toast.success(`Quick merge concluído: ${result.mergedCount} prestadores fundidos${result.failedCount > 0 ? `, ${result.failedCount} falharam` : ''}`)
          // Re-scan to show remaining duplicates
          handleScan()
        } else {
          toast.error(result.error || 'Erro no quick merge')
        }
      } catch (error) {
        toast.error('Erro ao executar quick merge')
      }
    })
  }

  const handleSelectForMerge = (group: DuplicateGroup, providerAId: string, providerBId: string) => {
    setSelectedGroup(group)
    setSelectedProviders({ a: providerAId, b: providerBId })
    setMergeDialogOpen(true)
  }

  const handleMergeComplete = () => {
    // Re-scan after merge
    setMergeDialogOpen(false)
    setSelectedProviders(null)
    setSelectedGroup(null)
    handleScan()
  }

  return (
    <div className="space-y-6">
      {/* Scan Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Procurar Duplicados
          </CardTitle>
          <CardDescription>
            Analisa a base de dados para encontrar prestadores duplicados por email, NIF ou nome similar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <Button onClick={handleScan} disabled={isPending || isQuickMerging} size="lg">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A analisar...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Iniciar Analise
                </>
              )}
            </Button>

            {result && exactMatchCount > 0 && (
              <Button
                onClick={handleQuickMerge}
                disabled={isPending || isQuickMerging}
                size="lg"
                variant="destructive"
              >
                {isQuickMerging ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A fundir...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Quick Merge ({exactMatchCount})
                  </>
                )}
              </Button>
            )}

            {result && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{result.scannedProviders} prestadores analisados</span>
                <span>•</span>
                <span>{result.groups.length} grupos encontrados</span>
                <span>•</span>
                <span className="font-medium text-foreground">{result.totalDuplicates} duplicados</span>
              </div>
            )}
          </div>
          {result && exactMatchCount > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Quick Merge funde automaticamente {exactMatchCount} duplicados por email/NIF, mantendo dados do prestador mais antigo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && result.groups.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">Nenhum duplicado encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              A base de dados esta limpa de duplicados.
            </p>
          </CardContent>
        </Card>
      )}

      {result && result.groups.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Grupos de Duplicados ({result.groups.length})
          </h2>

          {result.groups.map((group, index) => {
            const Icon = matchTypeIcons[group.matchType]

            return (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${matchTypeColors[group.matchType]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Match por {matchTypeLabels[group.matchType]}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono">{group.matchValue}</span>
                          {group.similarity && (
                            <Badge variant="outline" className="text-xs">
                              {group.similarity}% similar
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {group.providers.length} registos
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="border rounded-lg divide-y">
                    {group.providers.map((provider, pIndex) => (
                      <div
                        key={provider.id}
                        className="p-3 flex items-center justify-between hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {pIndex + 1}
                          </div>
                          <div>
                            <span className="font-medium">{provider.name}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{provider.email}</span>
                              {provider.nif && (
                                <>
                                  <span>•</span>
                                  <span>NIF: {provider.nif}</span>
                                </>
                              )}
                              {provider.status && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">
                                    {provider.status}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Merge button - only show for pairs */}
                        {pIndex < group.providers.length - 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectForMerge(
                              group,
                              group.providers[pIndex].id,
                              group.providers[pIndex + 1].id
                            )}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Fundir com #{pIndex + 2}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {group.providers.length > 2 && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Este grupo tem mais de 2 registos. Funda 2 de cada vez.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Merge Dialog */}
      {selectedProviders && (
        <MergeDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          providerAId={selectedProviders.a}
          providerBId={selectedProviders.b}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </div>
  )
}
