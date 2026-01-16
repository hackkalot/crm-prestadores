'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AngariacaoUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    pricesCount?: number
    materialsCount?: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validar extensão
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setResult({
          success: false,
          message: 'Por favor selecione um ficheiro Excel (.xlsx ou .xls)',
        })
        return
      }
      setFile(selectedFile)
      setResult(null)
      setShowConfirm(true)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setShowConfirm(false)
    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/angariacao/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: 'Importação concluída com sucesso!',
          pricesCount: data.pricesCount,
          materialsCount: data.materialsCount,
        })
        // Recarregar a página para mostrar novos dados
        router.refresh()
      } else {
        setResult({
          success: false,
          message: data.error || 'Erro ao importar ficheiro',
        })
      }
    } catch {
      setResult({
        success: false,
        message: 'Erro de rede ao enviar ficheiro',
      })
    } finally {
      setIsUploading(false)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCancel = () => {
    setShowConfirm(false)
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Atualizar Preços</CardTitle>
          </div>
          <CardDescription>
            Faça upload de um novo ficheiro Excel para atualizar os preços de referência.
            O ficheiro deve ter a mesma estrutura do original (sheets &quot;DB&quot; e
            &quot;Materiais_Canalizador&quot;).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
                disabled={isUploading}
              />
              <label htmlFor="excel-upload">
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A importar...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Selecionar Ficheiro Excel
                      </>
                    )}
                  </span>
                </Button>
              </label>

              {file && !isUploading && (
                <span className="text-sm text-muted-foreground">{file.name}</span>
              )}
            </div>

            {/* Resultado */}
            {result && (
              <div
                className={`flex items-start gap-2 p-4 rounded-lg ${
                  result.success
                    ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                    : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-5 w-5 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{result.message}</p>
                  {result.success && (
                    <p className="text-sm mt-1">
                      Importados: {result.pricesCount} preços de serviços,{' '}
                      {result.materialsCount} materiais
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmação */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá substituir todos os preços existentes pelos valores do novo
              ficheiro. Tem a certeza que deseja continuar?
              <br />
              <br />
              <strong>Ficheiro:</strong> {file?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpload}>Importar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
