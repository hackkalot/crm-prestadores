import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { LastSyncInfo } from '@/lib/sync/logs-actions'

interface LastSyncBadgeProps {
  syncInfo: LastSyncInfo
  label?: string
}

export function LastSyncBadge({ syncInfo, label }: LastSyncBadgeProps) {
  const { lastSuccessfulSync, status } = syncInfo

  const isInProgress = status === 'in_progress' || status === 'pending'
  const hasError = status === 'error' && !lastSuccessfulSync

  const getStatusIcon = () => {
    if (isInProgress) {
      return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
    }
    if (hasError) {
      return <AlertCircle className="h-3 w-3 text-destructive" />
    }
    return <CheckCircle2 className="h-3 w-3 text-green-500" />
  }

  const getTimeText = () => {
    if (isInProgress) {
      return 'A sincronizar...'
    }
    if (!lastSuccessfulSync) {
      return 'Nunca sincronizado'
    }
    return formatDistanceToNow(new Date(lastSuccessfulSync), {
      addSuffix: true,
      locale: pt,
    })
  }

  const getFullDate = () => {
    if (!lastSuccessfulSync) return null
    return new Date(lastSuccessfulSync).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
            <RefreshCw className="h-3 w-3" />
            {label && <span className="hidden sm:inline">{label}:</span>}
            <span className="flex items-center gap-1">
              {getStatusIcon()}
              <span>{getTimeText()}</span>
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs">
            {lastSuccessfulSync ? (
              <>
                <p className="font-medium">Ultimo sync com sucesso</p>
                <p className="text-muted-foreground">{getFullDate()}</p>
              </>
            ) : (
              <p>Nenhum sync realizado com sucesso</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
