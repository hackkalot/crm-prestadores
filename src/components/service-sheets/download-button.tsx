'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ServiceSheetDownloadButtonProps {
  providerId: string
  providerName?: string
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function ServiceSheetDownloadButton({
  providerId,
  variant = 'outline',
  size = 'sm',
  className,
}: ServiceSheetDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGeneratePDF = async () => {
    setIsLoading(true)

    try {
      // Fetch HTML from API
      const response = await fetch(`/api/service-sheets?providerId=${providerId}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao gerar ficha de serviço')
      }

      const { html } = await response.json()

      // Open in new tab and trigger print (same as task #4)
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

      // Clean up the blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) {
      console.error('Error generating service sheet:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar ficha de serviço')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleGeneratePDF}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      <span className="ml-2">Ficha de Serviço</span>
    </Button>
  )
}
