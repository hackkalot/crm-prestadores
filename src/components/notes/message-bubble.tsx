'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Pencil, Trash2, ListTodo, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { FileList } from '@/components/notes/file-chips'
import { cn } from '@/lib/utils'
import type { NoteWithDetails } from '@/lib/notes/actions'

interface MessageBubbleProps {
  note: NoteWithDetails
  isOwn: boolean
  onEdit: () => void
  onDelete: () => void
  isDeleting?: boolean
}

const noteTypeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  operacional: { label: 'Operacional', variant: 'default' },
  comercial: { label: 'Comercial', variant: 'secondary' },
  qualidade: { label: 'Qualidade', variant: 'outline' },
  outro: { label: 'Outro', variant: 'outline' },
}

function getUserInitials(name: string | undefined): string {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Check if content is long (more than ~3 lines of text)
function isContentLong(html: string): boolean {
  // Strip HTML tags and check character count
  const textContent = html.replace(/<[^>]*>/g, '')
  return textContent.length > 200
}

export function MessageBubble({
  note,
  isOwn,
  onEdit,
  onDelete,
  isDeleting,
}: MessageBubbleProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const userName = note.user?.name || 'Utilizador'
  const initials = getUserInitials(note.user?.name)
  const noteTypeInfo = note.note_type ? noteTypeConfig[note.note_type] : null
  const taskName = note.task?.task_definition?.name
  const timeAgo = formatDistanceToNow(new Date(note.created_at), {
    addSuffix: true,
    locale: pt,
  })
  const wasEdited = note.updated_at && note.updated_at !== note.created_at
  const contentIsLong = isContentLong(note.content)
  const shouldTruncate = contentIsLong && !isExpanded

  return (
    <>
      <div
        className={cn(
          'flex gap-3 max-w-[85%]',
          isOwn ? 'ml-auto flex-row-reverse' : ''
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium',
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {initials}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            'flex flex-col gap-1 rounded-2xl px-4 py-2 border',
            isOwn
              ? 'rounded-tr-sm'
              : 'rounded-tl-sm'
          )}
          style={{
            backgroundColor: isOwn ? '#fcf6f5' : '#f8f8fa',
            borderColor: isOwn ? '#f4d2d2' : '#e5e7eb',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{userName}</span>
            <span>•</span>
            <span>{timeAgo}</span>
            {wasEdited && (
              <>
                <span>•</span>
                <span className="italic">editado</span>
              </>
            )}
          </div>

          {/* Badges */}
          {(noteTypeInfo || taskName) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {noteTypeInfo && (
                <Badge
                  variant={noteTypeInfo.variant}
                  className="text-[10px] px-1.5 py-0"
                >
                  {noteTypeInfo.label}
                </Badge>
              )}
              {taskName && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 gap-1"
                >
                  <ListTodo className="h-2.5 w-2.5" />
                  {taskName}
                </Badge>
              )}
            </div>
          )}

          {/* Content - rendered as HTML from Tiptap */}
          <div
            className={cn(
              'prose prose-sm max-w-none text-foreground',
              'prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
              'prose-ul:list-disc prose-ol:list-decimal',
              shouldTruncate && 'line-clamp-3'
            )}
            dangerouslySetInnerHTML={{ __html: note.content }}
          />

          {/* Show more/less button */}
          {contentIsLong && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground self-start -ml-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Mostrar mais
                </>
              )}
            </Button>
          )}

          {/* Files */}
          {note.files.length > 0 && (
            <FileList
              files={note.files}
              className="mt-2"
            />
          )}
        </div>

        {/* Actions menu (only for own notes) */}
        {isOwn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Apagar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. A nota e todos os ficheiros anexados serão apagados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteDialog(false)
                onDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'A apagar...' : 'Apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
