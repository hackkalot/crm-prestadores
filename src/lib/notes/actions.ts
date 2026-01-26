'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const BUCKET_NAME = 'provider-documents'
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

// ============================================
// TYPES
// ============================================

export type NoteFile = {
  name: string
  url: string
  path: string
  size: number
  type: string
}

export type NoteWithDetails = {
  id: string
  content: string
  note_type: string | null
  task_id: string | null
  created_at: string
  updated_at: string | null
  created_by: string
  files: NoteFile[]
  user: { id: string; name: string; email: string } | null
  task?: { id: string; task_definition: { name: string } | null } | null
}

export type InProgressTask = {
  id: string
  name: string
  stage: string
}

export type NoteActionState = {
  error?: string
  success?: boolean
  noteId?: string
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all notes for a provider with user info, task info, and files
 * Ordered by created_at ASC (oldest first) for chat-style display
 */
export async function getProviderNotesWithFiles(
  providerId: string
): Promise<NoteWithDetails[]> {
  const { data, error } = await createAdminClient()
    .from('notes')
    .select(`
      id,
      content,
      note_type,
      task_id,
      created_at,
      updated_at,
      created_by,
      files,
      user:users!notes_created_by_fkey(id, name, email),
      task:onboarding_tasks!notes_task_id_fkey(
        id,
        task_definition:task_definitions(name)
      )
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching notes:', error)
    return []
  }

  return (data || []).map((note) => {
    // Supabase returns arrays for relations, extract first element or null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRaw = note.user as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskRaw = note.task as any

    // Handle user - could be array or single object
    let user: { id: string; name: string; email: string } | null = null
    if (userRaw) {
      if (Array.isArray(userRaw) && userRaw.length > 0) {
        user = userRaw[0]
      } else if (userRaw.id) {
        user = userRaw
      }
    }

    // Handle task with nested task_definition
    let task: { id: string; task_definition: { name: string } | null } | null = null
    if (taskRaw) {
      const taskObj = Array.isArray(taskRaw) ? taskRaw[0] : taskRaw
      if (taskObj?.id) {
        const taskDefRaw = taskObj.task_definition
        const taskDef = Array.isArray(taskDefRaw) ? taskDefRaw[0] : taskDefRaw
        task = {
          id: taskObj.id,
          task_definition: taskDef?.name ? { name: taskDef.name } : null,
        }
      }
    }

    return {
      id: note.id,
      content: note.content,
      note_type: note.note_type,
      task_id: note.task_id,
      created_at: note.created_at || '',
      updated_at: note.updated_at,
      created_by: note.created_by,
      // Parse files from JSON, default to empty array
      files: (note.files as NoteFile[] | null) || [],
      user,
      task,
    }
  })
}

/**
 * Get in-progress tasks for a provider (for task association dropdown)
 */
export async function getProviderInProgressTasks(
  providerId: string
): Promise<InProgressTask[]> {
  // First get the onboarding card for this provider
  const { data: card } = await createAdminClient()
    .from('onboarding_cards')
    .select('id')
    .eq('provider_id', providerId)
    .single()

  if (!card) {
    return []
  }

  const { data, error } = await createAdminClient()
    .from('onboarding_tasks')
    .select(`
      id,
      task_definition:task_definitions(
        name,
        stage:stage_definitions(name, stage_number)
      )
    `)
    .eq('card_id', card.id)
    .eq('status', 'em_curso')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching in-progress tasks:', error)
    return []
  }

  return (data || []).map((task) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defRaw = task.task_definition as any
    const def = Array.isArray(defRaw) ? defRaw[0] : defRaw

    let stageName = ''
    let stageNumber = ''
    let taskName = ''

    if (def) {
      taskName = def.name || ''
      const stageRaw = def.stage
      const stage = Array.isArray(stageRaw) ? stageRaw[0] : stageRaw
      if (stage) {
        stageName = stage.name || ''
        stageNumber = stage.stage_number || ''
      }
    }

    return {
      id: task.id,
      name: taskName,
      stage: stageNumber ? `${stageNumber} - ${stageName}` : stageName,
    }
  })
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Add a new note with optional files
 */
export async function addNote(
  prevState: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const content = formData.get('content') as string
  const noteType = formData.get('noteType') as string | null
  const taskId = formData.get('taskId') as string | null
  const filesJson = formData.get('files') as string | null

  if (!providerId || !content?.trim()) {
    return { error: 'Conteúdo da nota é obrigatório' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  // Parse files array from JSON string
  let files: NoteFile[] = []
  if (filesJson) {
    try {
      files = JSON.parse(filesJson)
    } catch {
      // Ignore parse errors, use empty array
    }
  }

  const admin = createAdminClient()

  const { data: note, error } = await admin
    .from('notes')
    .insert({
      provider_id: providerId,
      content: content.trim(),
      note_type: noteType || null,
      task_id: taskId || null,
      files: files,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating note:', error)
    return { error: 'Erro ao criar nota' }
  }

  // Log to history
  await admin.from('history_log').insert({
    provider_id: providerId,
    event_type: 'note_added',
    description: `Nota adicionada${noteType ? ` (${noteType})` : ''}`,
    new_value: { content: content.substring(0, 100), files_count: files.length },
    created_by: user.id,
  })

  revalidatePath(`/providers/${providerId}`)
  revalidatePath('/onboarding')

  return { success: true, noteId: note.id }
}

/**
 * Update an existing note (only author can update)
 */
export async function updateNote(
  prevState: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const supabase = await createClient()

  const noteId = formData.get('noteId') as string
  const content = formData.get('content') as string
  const noteType = formData.get('noteType') as string | null
  const taskId = formData.get('taskId') as string | null
  const filesJson = formData.get('files') as string | null

  if (!noteId || !content?.trim()) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  // Get existing note to check ownership
  const { data: existingNote } = await admin
    .from('notes')
    .select('created_by, provider_id, content, files')
    .eq('id', noteId)
    .single()

  if (!existingNote) {
    return { error: 'Nota não encontrada' }
  }

  if (existingNote.created_by !== user.id) {
    return { error: 'Sem permissão para editar esta nota' }
  }

  // Parse new files
  let files: NoteFile[] = []
  if (filesJson) {
    try {
      files = JSON.parse(filesJson)
    } catch {
      // Keep existing files on parse error
      files = (existingNote.files as NoteFile[] | null) || []
    }
  }

  // Find removed files to delete from storage
  const oldFiles = (existingNote.files as NoteFile[] | null) || []
  const newFilePaths = new Set(files.map(f => f.path))
  const removedFiles = oldFiles.filter(f => !newFilePaths.has(f.path))

  // Delete removed files from storage
  for (const file of removedFiles) {
    await admin.storage.from(BUCKET_NAME).remove([file.path])
  }

  // Update note
  const { error } = await admin
    .from('notes')
    .update({
      content: content.trim(),
      note_type: noteType || null,
      task_id: taskId || null,
      files: files,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)

  if (error) {
    console.error('Error updating note:', error)
    return { error: 'Erro ao atualizar nota' }
  }

  // Log to history
  await admin.from('history_log').insert({
    provider_id: existingNote.provider_id,
    event_type: 'note_updated',
    description: 'Nota atualizada',
    old_value: { content: existingNote.content?.substring(0, 100) },
    new_value: { content: content.substring(0, 100) },
    created_by: user.id,
  })

  revalidatePath(`/providers/${existingNote.provider_id}`)
  revalidatePath('/onboarding')

  return { success: true }
}

/**
 * Delete a note (only author can delete)
 */
export async function deleteNote(
  prevState: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const supabase = await createClient()

  const noteId = formData.get('noteId') as string

  if (!noteId) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  // Get existing note to check ownership and get files
  const { data: note } = await admin
    .from('notes')
    .select('created_by, provider_id, content, files')
    .eq('id', noteId)
    .single()

  if (!note) {
    return { error: 'Nota não encontrada' }
  }

  if (note.created_by !== user.id) {
    return { error: 'Sem permissão para apagar esta nota' }
  }

  // Delete files from storage
  const files = (note.files as NoteFile[] | null) || []
  if (files.length > 0) {
    const paths = files.map(f => f.path)
    await admin.storage.from(BUCKET_NAME).remove(paths)
  }

  // Delete note from database
  const { error } = await admin
    .from('notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    console.error('Error deleting note:', error)
    return { error: 'Erro ao apagar nota' }
  }

  // Log to history
  await admin.from('history_log').insert({
    provider_id: note.provider_id,
    event_type: 'note_deleted',
    description: 'Nota apagada',
    old_value: { content: note.content?.substring(0, 100) },
    created_by: user.id,
  })

  revalidatePath(`/providers/${note.provider_id}`)
  revalidatePath('/onboarding')

  return { success: true }
}

// ============================================
// FILE OPERATIONS
// ============================================

/**
 * Upload a file to storage (returns file info to be stored with note)
 */
export async function uploadNoteFile(
  formData: FormData
): Promise<{ error?: string; file?: NoteFile }> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const file = formData.get('file') as File

  if (!providerId || !file) {
    return { error: 'Dados incompletos' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: 'Ficheiro demasiado grande (máx. 25MB)' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  // Generate unique filename in notes subfolder
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `notes/${providerId}/${timestamp}-${sanitizedName}`

  // Upload file to Supabase Storage
  const { error: uploadError } = await admin.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('Error uploading file:', uploadError)
    return { error: 'Erro ao fazer upload do ficheiro' }
  }

  // Get public URL
  const { data: urlData } = admin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return {
    file: {
      name: file.name,
      url: urlData.publicUrl,
      path: filePath,
      size: file.size,
      type: file.type,
    },
  }
}

/**
 * Delete a file from storage (used when removing from draft note)
 */
export async function deleteNoteFile(
  filePath: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  const { error } = await admin.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (error) {
    console.error('Error deleting file:', error)
    return { error: 'Erro ao apagar ficheiro' }
  }

  return { success: true }
}
