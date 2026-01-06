'use client'

import { useState, useTransition, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MessageSquare,
  Plus,
  Send,
  FileText,
  Upload,
  Trash2,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  Loader2,
  X,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { addNote } from '@/lib/onboarding/actions'
import { uploadDocument, deleteDocument } from '@/lib/documents/actions'

interface NotasTabProps {
  providerId: string
  notes: Array<{
    id: string
    content: string
    note_type?: string | null
    created_at: string
    user?: { id: string; name: string; email: string } | null
  }>
  documents?: Array<{
    id: string
    file_name: string
    file_url: string
    file_size: number
    file_type: string
    document_type?: string | null
    description?: string | null
    created_at: string
    uploaded_by_user?: { id: string; name: string; email: string } | null
  }>
}

const noteTypes = [
  { value: 'operacional', label: 'Operacional' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'qualidade', label: 'Qualidade' },
  { value: 'outro', label: 'Outro' },
]

const documentTypes = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'identificacao', label: 'Identificação' },
  { value: 'certificado', label: 'Certificado' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'comprovativo', label: 'Comprovativo' },
  { value: 'outro', label: 'Outro' },
]

const noteTypeColors: Record<string, 'default' | 'secondary' | 'info' | 'warning'> = {
  operacional: 'default',
  comercial: 'info',
  qualidade: 'warning',
  outro: 'secondary',
}

const documentTypeColors: Record<string, 'default' | 'secondary' | 'info' | 'warning' | 'success'> = {
  contrato: 'default',
  identificacao: 'info',
  certificado: 'success',
  seguro: 'warning',
  comprovativo: 'info',
  outro: 'secondary',
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return FileImage
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet
  if (fileType.includes('pdf')) return FileText
  return File
}

export function NotasTab({ providerId, notes, documents = [] }: NotasTabProps) {
  const [isPending, startTransition] = useTransition()
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [showDocForm, setShowDocForm] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteType, setNoteType] = useState('operacional')
  const [docType, setDocType] = useState('outro')
  const [docDescription, setDocDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim()) return

    startTransition(async () => {
      const formData = new FormData()
      formData.append('providerId', providerId)
      formData.append('content', noteContent)
      formData.append('noteType', noteType)

      const result = await addNote({}, formData)
      if (result.success) {
        setNoteContent('')
        setShowNoteForm(false)
      }
    })
  }

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    startTransition(async () => {
      const formData = new FormData()
      formData.append('providerId', providerId)
      formData.append('file', selectedFile)
      formData.append('documentType', docType)
      formData.append('description', docDescription)

      const result = await uploadDocument({}, formData)
      if (result.success) {
        setSelectedFile(null)
        setDocDescription('')
        setShowDocForm(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    })
  }

  const handleDeleteDoc = (docId: string) => {
    setDeletingId(docId)
    startTransition(async () => {
      const formData = new FormData()
      formData.append('documentId', docId)
      await deleteDocument({}, formData)
      setDeletingId(null)
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setShowDocForm(true)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notas & Documentos
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="notas" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="notas" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Notas
                {notes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {notes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="documentos" className="gap-1.5">
                <FileText className="h-4 w-4" />
                Documentos
                {documents.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {documents.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Notas Tab */}
          <TabsContent value="notas" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant={showNoteForm ? 'secondary' : 'default'}
                onClick={() => setShowNoteForm(!showNoteForm)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {showNoteForm ? 'Cancelar' : 'Nova Nota'}
              </Button>
            </div>

            {showNoteForm && (
              <form onSubmit={handleNoteSubmit} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex gap-2">
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {noteTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Escreva a sua nota..."
                  className="w-full min-h-[100px] p-3 border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={isPending}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isPending || !noteContent.trim()}>
                    {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                    Guardar
                  </Button>
                </div>
              </form>
            )}

            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Sem notas registadas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {note.note_type && (
                          <Badge variant={noteTypeColors[note.note_type] || 'secondary'}>
                            {noteTypes.find((t) => t.value === note.note_type)?.label || note.note_type}
                          </Badge>
                        )}
                        <span className="text-sm font-medium">{note.user?.name || 'Utilizador'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDateTime(note.created_at)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Documentos Tab */}
          <TabsContent value="documentos" className="space-y-4">
            <div className="flex justify-end">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                <Upload className="h-4 w-4 mr-1" />
                Carregar Documento
              </Button>
            </div>

            {showDocForm && selectedFile && (
              <form onSubmit={handleDocSubmit} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-background rounded-md border">
                  <File className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedFile(null)
                      setShowDocForm(false)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tipo de Documento</label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Descrição (opcional)</label>
                    <input
                      type="text"
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      placeholder="Breve descrição..."
                      className="w-full h-10 px-3 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null)
                      setShowDocForm(false)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    Carregar
                  </Button>
                </div>
              </form>
            )}

            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Sem documentos carregados.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const FileIcon = getFileIcon(doc.file_type)
                  return (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          {doc.document_type && (
                            <Badge variant={documentTypeColors[doc.document_type] || 'secondary'} className="shrink-0">
                              {documentTypes.find((t) => t.value === doc.document_type)?.label || doc.document_type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{doc.uploaded_by_user?.name || 'Utilizador'}</span>
                          <span>•</span>
                          <span>{formatDateTime(doc.created_at)}</span>
                        </div>
                        {doc.description && <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDoc(doc.id)}
                          disabled={deletingId === doc.id}
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
