'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { Send, Paperclip, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { FileChips } from '@/components/notes/file-chips'
import { addNote, uploadNoteFile, deleteNoteFile } from '@/lib/notes/actions'
import type { NoteFile, InProgressTask, NoteWithDetails } from '@/lib/notes/actions'
import { cn } from '@/lib/utils'

interface NoteComposerProps {
  providerId: string
  inProgressTasks: InProgressTask[]
  onNoteAdded?: () => void
  // For editing mode
  editingNote?: NoteWithDetails
  onCancelEdit?: () => void
  onNoteUpdated?: () => void
}

const NOTE_TYPES = [
  { value: 'operacional', label: 'Operacional' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'qualidade', label: 'Qualidade' },
  { value: 'outro', label: 'Outro' },
]

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export function NoteComposer({
  providerId,
  inProgressTasks,
  onNoteAdded,
  editingNote,
  onCancelEdit,
  onNoteUpdated,
}: NoteComposerProps) {
  const [isExpanded, setIsExpanded] = useState(!!editingNote)
  const [content, setContent] = useState(editingNote?.content || '')
  const [noteType, setNoteType] = useState<string>(editingNote?.note_type || 'operacional')
  const [taskId, setTaskId] = useState<string | null>(editingNote?.task_id || null)
  const [files, setFiles] = useState<NoteFile[]>(editingNote?.files || [])
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEditing = !!editingNote
  const hasContent = content.trim() && content !== '<p></p>'
  const canSubmit = hasContent && !isUploading && !isPending

  // Auto-expand when editing
  useEffect(() => {
    if (editingNote) {
      setIsExpanded(true)
      setContent(editingNote.content)
      setNoteType(editingNote.note_type || 'operacional')
      setTaskId(editingNote.task_id)
      setFiles(editingNote.files || [])
    }
  }, [editingNote])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setIsUploading(true)

    for (const file of Array.from(selectedFiles)) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`O ficheiro "${file.name}" é demasiado grande (máx. 25MB)`)
        continue
      }

      const formData = new FormData()
      formData.append('providerId', providerId)
      formData.append('file', file)

      const result = await uploadNoteFile(formData)

      if (result.error) {
        alert(`Erro ao carregar "${file.name}": ${result.error}`)
      } else if (result.file) {
        setFiles((prev) => [...prev, result.file!])
      }
    }

    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = async (file: NoteFile) => {
    await deleteNoteFile(file.path)
    setFiles((prev) => prev.filter((f) => f.path !== file.path))
  }

  const handleSubmit = () => {
    if (!canSubmit) return

    startTransition(async () => {
      const formData = new FormData()

      if (isEditing) {
        formData.append('noteId', editingNote.id)
      } else {
        formData.append('providerId', providerId)
      }

      formData.append('content', content)
      formData.append('noteType', noteType)
      if (taskId) {
        formData.append('taskId', taskId)
      }
      formData.append('files', JSON.stringify(files))

      if (isEditing) {
        const { updateNote } = await import('@/lib/notes/actions')
        const result = await updateNote({}, formData)

        if (result.error) {
          alert(result.error)
        } else {
          onNoteUpdated?.()
        }
      } else {
        const result = await addNote({}, formData)

        if (result.error) {
          alert(result.error)
        } else {
          // Reset form
          setContent('')
          setFiles([])
          setTaskId(null)
          setIsExpanded(false)
          onNoteAdded?.()
        }
      }
    })
  }

  const handleClose = () => {
    // Clean up any uploaded files that weren't saved
    if (!isEditing && files.length > 0) {
      files.forEach((file) => deleteNoteFile(file.path))
    }
    setContent('')
    setFiles([])
    setTaskId(null)
    setIsExpanded(false)
    onCancelEdit?.()
  }

  // Collapsed state - simple input trigger
  if (!isExpanded) {
    return (
      <div
        className="flex items-center gap-3 p-3 border rounded-lg bg-card cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1 text-muted-foreground text-sm">
          Adicionar nota...
        </span>
        <Button size="sm" variant="default">
          Nova
        </Button>
      </div>
    )
  }

  // Expanded state - full composer
  return (
    <div className="border rounded-lg bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{isEditing ? 'Editar nota' : 'Nova nota'}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* File attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Anexar ficheiro"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
          >
            Fechar
          </Button>
        </div>
      </div>

      {/* Rich text editor */}
      <RichTextEditor
        content={content}
        onChange={setContent}
        placeholder="Escreva uma nota..."
        minHeight="120px"
        className="border-0 rounded-none"
      />

      {/* Attached files */}
      {files.length > 0 && (
        <div className="px-4 py-2 border-t">
          <FileChips files={files} onRemove={handleRemoveFile} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
        <div className="flex items-center gap-2">
          {/* Note type selector */}
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <span>{NOTE_TYPES.find(t => t.value === noteType)?.label || 'Tipo'}</span>
            </SelectTrigger>
            <SelectContent>
              {NOTE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Task selector */}
          {inProgressTasks.length > 0 && (
            <Select
              value={taskId || 'none'}
              onValueChange={(v) => setTaskId(v === 'none' ? null : v)}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <span className="truncate">
                  {taskId ? (
                    <>
                      {inProgressTasks.find((t) => t.id === taskId)?.stage}:{' '}
                      {inProgressTasks.find((t) => t.id === taskId)?.name}
                    </>
                  ) : (
                    'Associar tarefa'
                  )}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem tarefa</SelectItem>
                {inProgressTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    <span className="text-muted-foreground">{task.stage}:</span>{' '}
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="sm"
            className={cn('gap-2', isPending && 'opacity-70')}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isEditing ? 'Guardar' : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
