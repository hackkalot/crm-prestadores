'use client'

import { useState, useRef, useEffect, useTransition, useMemo } from 'react'
import { MessageSquare, FileText, Paperclip, Download } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageBubble } from '@/components/notes/message-bubble'
import { NoteComposer } from '@/components/notes/note-composer'
import { deleteNote } from '@/lib/notes/actions'
import type { NoteWithDetails, InProgressTask, NoteFile } from '@/lib/notes/actions'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'

// Import existing documents functionality
import { getProviderDocuments } from '@/lib/documents/actions'

interface ChatNotesTabProps {
  providerId: string
  notes: NoteWithDetails[]
  currentUserId: string
  inProgressTasks: InProgressTask[]
  documents: Awaited<ReturnType<typeof getProviderDocuments>>
}

// File icon based on type
function getFileIcon(type: string) {
  if (type.startsWith('image/')) return '🖼️'
  if (type.includes('pdf')) return '📄'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('sheet') || type.includes('excel')) return '📊'
  return '📎'
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Combined documents section showing both uploaded docs and note attachments
function DocumentsSection({
  providerId,
  documents,
  noteFiles,
}: {
  providerId: string
  documents: ChatNotesTabProps['documents']
  noteFiles: Array<NoteFile & { noteId: string; noteDate: string; userName: string }>
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('')
  const [description, setDescription] = useState('')

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)

    const formData = new FormData()
    formData.append('providerId', providerId)
    formData.append('file', file)
    formData.append('documentType', documentType)
    formData.append('description', description)

    const { uploadDocument } = await import('@/lib/documents/actions')
    const result = await uploadDocument({}, formData)

    if (result.error) {
      alert(result.error)
    } else {
      setFile(null)
      setDocumentType('')
      setDescription('')
    }

    setIsUploading(false)
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Tem a certeza que pretende apagar este documento?')) return

    const formData = new FormData()
    formData.append('documentId', docId)

    const { deleteDocument } = await import('@/lib/documents/actions')
    await deleteDocument({}, formData)
  }

  const totalCount = documents.length + noteFiles.length

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-medium">Carregar Documento</h3>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
        />
        {file && (
          <>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="block w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Tipo de documento</option>
              <option value="contrato">Contrato</option>
              <option value="identificacao">Identificação</option>
              <option value="certificado">Certificado</option>
              <option value="seguro">Seguro</option>
              <option value="comprovativo">Comprovativo</option>
              <option value="outro">Outro</option>
            </select>
            <input
              type="text"
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full rounded-md border px-3 py-2 text-sm"
            />
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
            >
              {isUploading ? 'A carregar...' : 'Carregar'}
            </button>
          </>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Sem documentos</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Uploaded documents */}
          {documents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos carregados ({documents.length})
              </h4>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline truncate block"
                      >
                        {doc.file_name}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {doc.document_type && `${doc.document_type} • `}
                        {formatFileSize(doc.file_size)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-destructive hover:text-destructive/80 text-sm flex-shrink-0"
                    >
                      Apagar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note attachments */}
          {noteFiles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos de notas ({noteFiles.length})
              </h4>
              <div className="space-y-2">
                {noteFiles.map((file, index) => (
                  <div
                    key={`${file.noteId}-${file.path}-${index}`}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                    style={{ backgroundColor: '#fcf6f5', borderColor: '#f4d2d2' }}
                  >
                    <span className="text-lg flex-shrink-0">{getFileIcon(file.type)}</span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline truncate block"
                      >
                        {file.name}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {file.userName} • {formatDistanceToNow(new Date(file.noteDate), { addSuffix: true, locale: pt })}
                      </p>
                    </div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground flex-shrink-0"
                      title="Descarregar"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ChatNotesTab({
  providerId,
  notes: initialNotes,
  currentUserId,
  inProgressTasks,
  documents,
}: ChatNotesTabProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [editingNote, setEditingNote] = useState<NoteWithDetails | null>(null)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  // Extract all files from notes with metadata
  const noteFiles = useMemo(() => {
    const files: Array<NoteFile & { noteId: string; noteDate: string; userName: string }> = []

    notes.forEach((note) => {
      note.files.forEach((file) => {
        files.push({
          ...file,
          noteId: note.id,
          noteDate: note.created_at,
          userName: note.user?.name || 'Utilizador',
        })
      })
    })

    // Sort by date descending (most recent first)
    return files.sort((a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime())
  }, [notes])

  // Total document count for tab badge
  const totalDocCount = documents.length + noteFiles.length

  // Auto-scroll to bottom on mount and when notes change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  // Update notes when props change (after revalidation)
  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  // Scroll to composer when editing starts
  useEffect(() => {
    if (editingNote) {
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [editingNote])

  const handleDelete = (noteId: string) => {
    setDeletingNoteId(noteId)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('noteId', noteId)

      const result = await deleteNote({}, formData)

      if (result.error) {
        alert(result.error)
      } else {
        // Optimistically remove from UI
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      }

      setDeletingNoteId(null)
    })
  }

  const handleEdit = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId)
    if (note) {
      setEditingNote(note)
    }
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
  }

  const handleNoteUpdated = () => {
    setEditingNote(null)
    // Notes will be refreshed via revalidation
  }

  const handleNoteAdded = () => {
    // Notes will be refreshed via revalidation
    // Scroll to bottom is handled by useEffect
  }

  return (
    <Tabs defaultValue="notas" className="h-full flex flex-col">
      <TabsList className="w-fit">
        <TabsTrigger value="notas" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Notas ({notes.length})
        </TabsTrigger>
        <TabsTrigger value="documentos" className="gap-2">
          <FileText className="h-4 w-4" />
          Documentos ({totalDocCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="notas" className="flex-1 flex flex-col mt-4 min-h-0">
        {/* Chat feed */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg min-h-[200px] max-h-[400px]">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">Sem notas registadas</p>
              <p className="text-xs">Adicione a primeira nota abaixo</p>
            </div>
          ) : (
            notes.map((note) => {
              const isOwn = note.created_by === currentUserId

              return (
                <div key={note.id} className="group">
                  <MessageBubble
                    note={note}
                    isOwn={isOwn}
                    onEdit={() => handleEdit(note.id)}
                    onDelete={() => handleDelete(note.id)}
                    isDeleting={deletingNoteId === note.id}
                  />
                </div>
              )
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Composer - always visible at bottom, handles both create and edit */}
        <div ref={composerRef} className="mt-4 pt-4 border-t">
          <NoteComposer
            key={editingNote?.id || 'new'} // Force remount when switching between edit/create
            providerId={providerId}
            inProgressTasks={inProgressTasks}
            editingNote={editingNote || undefined}
            onCancelEdit={handleCancelEdit}
            onNoteAdded={handleNoteAdded}
            onNoteUpdated={handleNoteUpdated}
          />
        </div>
      </TabsContent>

      <TabsContent value="documentos" className="flex-1 mt-4">
        <DocumentsSection
          providerId={providerId}
          documents={documents}
          noteFiles={noteFiles}
        />
      </TabsContent>
    </Tabs>
  )
}
