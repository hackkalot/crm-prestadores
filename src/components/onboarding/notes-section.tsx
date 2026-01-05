'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { addNote } from '@/lib/onboarding/actions'
import { formatDateTime } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageSquare, Plus, Send } from 'lucide-react'

interface Note {
  id: string
  content: string
  note_type: string | null
  created_at: string
  created_by_user?: {
    id: string
    name: string
  }
}

interface NotesSectionProps {
  providerId: string
  notes: Note[]
}

const noteTypes = [
  { value: 'operacional', label: 'Operacional' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'qualidade', label: 'Qualidade' },
  { value: 'outro', label: 'Outro' },
]

const noteTypeColors: Record<string, 'default' | 'secondary' | 'info' | 'warning'> = {
  operacional: 'default',
  comercial: 'info',
  qualidade: 'warning',
  outro: 'secondary',
}

export function NotesSection({ providerId, notes }: NotesSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState('')
  const [noteType, setNoteType] = useState('operacional')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    startTransition(async () => {
      const formData = new FormData()
      formData.append('providerId', providerId)
      formData.append('content', content)
      formData.append('noteType', noteType)

      const result = await addNote({}, formData)
      if (result.success) {
        setContent('')
        setShowForm(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Notas ({notes.length})</h3>
        </div>
        <Button
          size="sm"
          variant={showForm ? 'secondary' : 'default'}
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4 mr-1" />
          {showForm ? 'Cancelar' : 'Nova Nota'}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-muted/30 space-y-3">
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
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva a sua nota..."
            className="w-full min-h-[100px] p-3 border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isPending}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending || !content.trim()}>
              <Send className="h-4 w-4 mr-1" />
              Guardar
            </Button>
          </div>
        </form>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhuma nota registada.
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="p-3 border rounded-lg bg-card">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {note.note_type && (
                    <Badge variant={noteTypeColors[note.note_type] || 'secondary'}>
                      {noteTypes.find(t => t.value === note.note_type)?.label || note.note_type}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {note.created_by_user?.name || 'Utilizador'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(note.created_at)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
