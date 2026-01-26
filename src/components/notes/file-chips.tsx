'use client'

import { X, FileText, Image, FileSpreadsheet, File, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { NoteFile } from '@/lib/notes/actions'

interface FileChipsProps {
  files: NoteFile[]
  onRemove?: (file: NoteFile) => void
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return Image
  }
  if (mimeType.includes('pdf')) {
    return FileText
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return FileSpreadsheet
  }
  return File
}

function getFileIconColor(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'text-green-600'
  }
  if (mimeType.includes('pdf')) {
    return 'text-red-600'
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return 'text-emerald-600'
  }
  return 'text-blue-600'
}

export function FileChips({ files, onRemove, className }: FileChipsProps) {
  if (files.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {files.map((file, index) => {
        const Icon = getFileIcon(file.type)
        const iconColor = getFileIconColor(file.type)

        return (
          <div
            key={`${file.path}-${index}`}
            className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm"
          >
            <Icon className={cn('h-4 w-4 flex-shrink-0', iconColor)} />
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-[150px] truncate hover:underline"
              title={file.name}
            >
              {file.name}
            </a>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
            {onRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full hover:bg-destructive/20"
                onClick={() => onRemove(file)}
              >
                <X className="h-3 w-3" />
              </Button>
            ) : (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 rounded-full p-1 hover:bg-muted-foreground/20"
              >
                <Download className="h-3 w-3" />
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Compact version for message bubbles
interface FileListProps {
  files: NoteFile[]
  className?: string
}

export function FileList({ files, className }: FileListProps) {
  if (files.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {files.map((file, index) => {
        const Icon = getFileIcon(file.type)
        const iconColor = getFileIconColor(file.type)

        return (
          <a
            key={`${file.path}-${index}`}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded bg-background/50 px-2 py-1 text-xs hover:bg-background/80 transition-colors"
          >
            <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', iconColor)} />
            <span className="truncate flex-1" title={file.name}>
              {file.name}
            </span>
            <span className="text-muted-foreground flex-shrink-0">
              {formatFileSize(file.size)}
            </span>
            <Download className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          </a>
        )
      })}
    </div>
  )
}
