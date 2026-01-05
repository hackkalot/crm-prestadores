'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { addPrestadorNote } from '@/lib/prestadores/actions'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, MessageSquare, Briefcase, Tag, HelpCircle } from 'lucide-react'

interface Note {
  id: string
  content: string
  note_type?: string
  created_at: string
  created_by_user?: {
    id: string
    name: string
  }
}

interface PrestadorNotesSectionProps {
  providerId: string
  notes: Note[]
}

const noteTypeLabels: Record<string, string> = {
  operacional: 'Operacional',
  comercial: 'Comercial',
  qualidade: 'Qualidade',
  outro: 'Outro',
}

const noteTypeIcons: Record<string, typeof Tag> = {
  operacional: Briefcase,
  comercial: Tag,
  qualidade: MessageSquare,
  outro: HelpCircle,
}

export function PrestadorNotesSection({ providerId, notes }: PrestadorNotesSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState('')
  const [noteType, setNoteType] = useState('')

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error('Escreva o conteudo da nota')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('providerId', providerId)
      formData.append('content', content)
      if (noteType) formData.append('noteType', noteType)

      const result = await addPrestadorNote({}, formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Nota adicionada')
      setContent('')
      setNoteType('')
      setShowForm(false)
    })
  }

  return (
    <div className="space-y-4">
      {/* Add Note Button/Form */}
      {!showForm ? (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Nota
        </Button>
      ) : (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <div className="flex gap-3">
            <div className="flex-1">
              <Textarea
                placeholder="Escreva a nota..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operacional">Operacional</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="qualidade">Qualidade</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false)
                setContent('')
                setNoteType('')
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma nota registada.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const NoteIcon = noteTypeIcons[note.note_type || 'outro'] || MessageSquare

            return (
              <div key={note.id} className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <NoteIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {note.created_by_user?.name || 'Utilizador'}
                      </span>
                      {note.note_type && (
                        <Badge variant="outline" className="text-xs">
                          {noteTypeLabels[note.note_type] || note.note_type}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(note.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
