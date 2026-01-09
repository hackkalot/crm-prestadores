'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { parseCSVRows, type ParsedProvider, type RawCSVRow } from '@/lib/import/csv-parser'
import {
  importProviders,
  checkDuplicates,
  importProvidersWithoutDuplicateCheck,
  updateDuplicateProviders,
  type DuplicateProvider,
  type ImportResult,
} from '@/lib/import/actions'
import { toast } from 'sonner'
import Papa from 'papaparse'

type ImportStep = 'upload' | 'preview' | 'duplicates' | 'processing' | 'complete'

interface ImportState {
  step: ImportStep
  parsedProviders: ParsedProvider[]
  parseErrors: Array<{ row: number; error: string }>
  duplicates: DuplicateProvider[]
  nonDuplicates: ParsedProvider[]
  selectedDuplicateActions: Map<string, 'skip' | 'update'> // email -> action
  result?: ImportResult
}

export function ImportProvidersDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<ImportState>({
    step: 'upload',
    parsedProviders: [],
    parseErrors: [],
    duplicates: [],
    nonDuplicates: [],
    selectedDuplicateActions: new Map(),
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar extensão
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error('Ficheiro inválido. Use CSV ou XLSX.')
      return
    }

    // Parse CSV
    Papa.parse<RawCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { success, errors } = parseCSVRows(results.data)

        setState({
          ...state,
          step: 'preview',
          parsedProviders: success,
          parseErrors: errors,
        })

        if (success.length === 0) {
          toast.error('Nenhum prestador válido encontrado no ficheiro')
        } else {
          toast.success(`${success.length} prestadores encontrados`)
          if (errors.length > 0) {
            toast.warning(`${errors.length} linhas com erros foram ignoradas`)
          }
        }
      },
      error: (error) => {
        toast.error(`Erro ao ler ficheiro: ${error.message}`)
      },
    })
  }

  const handleCheckDuplicates = () => {
    startTransition(async () => {
      const { duplicates, nonDuplicates } = await checkDuplicates(state.parsedProviders)

      if (duplicates.length === 0) {
        // Não há duplicados, ir direto para import
        setState({
          ...state,
          step: 'processing',
          duplicates: [],
          nonDuplicates,
        })
        handleFinalImport(nonDuplicates, [])
      } else {
        // Há duplicados, mostrar para user decidir
        setState({
          ...state,
          step: 'duplicates',
          duplicates,
          nonDuplicates,
        })
      }
    })
  }

  const handleDuplicateAction = (email: string, action: 'skip' | 'update') => {
    const newActions = new Map(state.selectedDuplicateActions)
    newActions.set(email, action)
    setState({
      ...state,
      selectedDuplicateActions: newActions,
    })
  }

  const handleFinalImport = async (
    nonDuplicates: ParsedProvider[],
    duplicates: DuplicateProvider[]
  ) => {
    // Separar duplicados por ação
    const toUpdate = duplicates.filter((d) =>
      state.selectedDuplicateActions.get(d.parsed.email) === 'update'
    )
    const toSkip = duplicates.filter((d) =>
      state.selectedDuplicateActions.get(d.parsed.email) === 'skip'
    )

    // Importar não-duplicados
    const createResult = await importProvidersWithoutDuplicateCheck(nonDuplicates)

    // Atualizar duplicados marcados para update
    const updateResult =
      toUpdate.length > 0 ? await updateDuplicateProviders(toUpdate) : { updated: 0, errors: [] }

    // Resultado final
    const finalResult: ImportResult = {
      created: createResult.created,
      updated: updateResult.updated,
      skipped: toSkip.length + createResult.skipped,
      errors: [...createResult.errors, ...updateResult.errors],
    }

    setState({
      ...state,
      step: 'complete',
      result: finalResult,
    })

    // Toast summary
    const successCount = finalResult.created + finalResult.updated
    if (successCount > 0) {
      toast.success(
        `Import concluído: ${finalResult.created} criados, ${finalResult.updated} atualizados`
      )
    }
    if (finalResult.skipped > 0) {
      toast.info(`${finalResult.skipped} prestadores ignorados (duplicados)`)
    }
    if (finalResult.errors.length > 0) {
      toast.error(`${finalResult.errors.length} erros durante o import`)
    }
  }

  const handleConfirmDuplicates = () => {
    startTransition(async () => {
      setState({
        ...state,
        step: 'processing',
      })
      await handleFinalImport(state.nonDuplicates, state.duplicates)
    })
  }

  const handleReset = () => {
    setState({
      step: 'upload',
      parsedProviders: [],
      parseErrors: [],
      duplicates: [],
      nonDuplicates: [],
      selectedDuplicateActions: new Map(),
    })
  }

  const handleClose = () => {
    setOpen(false)
    // Reset após fechar
    setTimeout(() => {
      handleReset()
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Prestadores</DialogTitle>
          <DialogDescription>
            Faça upload de um ficheiro CSV ou XLSX exportado do HubSpot
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {state.step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-sm font-medium mb-2">
                  Clique para selecionar ficheiro
                </div>
                <div className="text-xs text-muted-foreground">
                  CSV ou XLSX (máx. 10MB)
                </div>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {state.step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {state.parsedProviders.length} prestadores válidos
                </p>
                {state.parseErrors.length > 0 && (
                  <p className="text-xs text-destructive">
                    {state.parseErrors.length} linhas com erros
                  </p>
                )}
              </div>
              <Badge variant="secondary">{state.parsedProviders.length} total</Badge>
            </div>

            {/* Preview table */}
            <div className="border rounded-lg max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Nome</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Serviços</th>
                  </tr>
                </thead>
                <tbody>
                  {state.parsedProviders.slice(0, 10).map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{p.name}</td>
                      <td className="p-2 text-xs">{p.email}</td>
                      <td className="p-2">
                        <Badge variant="outline">{p.entity_type}</Badge>
                      </td>
                      <td className="p-2 text-xs">{p.services?.slice(0, 2).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {state.parsedProviders.length > 10 && (
                <div className="p-2 text-xs text-center text-muted-foreground border-t">
                  + {state.parsedProviders.length - 10} mais...
                </div>
              )}
            </div>

            {/* Parse errors */}
            {state.parseErrors.length > 0 && (
              <div className="border border-destructive rounded-lg p-3 bg-destructive/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium">Erros de parsing</p>
                </div>
                <div className="space-y-1 max-h-32 overflow-auto">
                  {state.parseErrors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      Linha {e.row}: {e.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleCheckDuplicates}
                disabled={isPending || state.parsedProviders.length === 0}
                className="flex-1"
              >
                {isPending ? 'A verificar...' : 'Continuar'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Duplicates */}
        {state.step === 'duplicates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{state.duplicates.length} duplicados encontrados</p>
                <p className="text-xs text-muted-foreground">
                  Escolha a ação para cada prestador duplicado
                </p>
              </div>
            </div>

            {/* Duplicates list */}
            <div className="border rounded-lg max-h-96 overflow-auto">
              <div className="space-y-2 p-3">
                {state.duplicates.map((dup, index) => {
                  const action = state.selectedDuplicateActions.get(dup.parsed.email) || 'skip'

                  return (
                    <div key={`${dup.parsed.email}-${index}`} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{dup.parsed.name}</p>
                          <p className="text-xs text-muted-foreground">{dup.parsed.email}</p>
                        </div>
                        <Badge variant="secondary">{dup.existing.status}</Badge>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Já existe em sistema: <span className="font-medium">{dup.existing.name}</span> (
                        {dup.existing.application_count} candidaturas)
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={action === 'skip' ? 'default' : 'outline'}
                          onClick={() => handleDuplicateAction(dup.parsed.email, 'skip')}
                          className="flex-1"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Ignorar
                        </Button>
                        <Button
                          size="sm"
                          variant={action === 'update' ? 'default' : 'outline'}
                          onClick={() => handleDuplicateAction(dup.parsed.email, 'update')}
                          className="flex-1"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Atualizar
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleConfirmDuplicates} disabled={isPending} className="flex-1">
                {isPending ? 'A importar...' : 'Confirmar Import'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Processing */}
        {state.step === 'processing' && (
          <div className="py-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm font-medium">A importar prestadores...</p>
          </div>
        )}

        {/* Step 5: Complete */}
        {state.step === 'complete' && state.result && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Import Concluído</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{state.result.created}</p>
                <p className="text-xs text-muted-foreground">Criados</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{state.result.updated}</p>
                <p className="text-xs text-muted-foreground">Atualizados</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-600">{state.result.skipped}</p>
                <p className="text-xs text-muted-foreground">Ignorados</p>
              </div>
            </div>

            {state.result.errors.length > 0 && (
              <div className="border border-destructive rounded-lg p-3 bg-destructive/5">
                <p className="text-sm font-medium mb-2">Erros ({state.result.errors.length})</p>
                <div className="space-y-1 max-h-32 overflow-auto">
                  {state.result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {e.provider.name}: {e.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
