'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const BUCKET_NAME = 'provider-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export type UploadDocumentState = {
  error?: string
  success?: boolean
  documentId?: string
}

export async function uploadDocument(
  prevState: UploadDocumentState,
  formData: FormData
): Promise<UploadDocumentState> {
  const supabase = await createClient()

  const providerId = formData.get('providerId') as string
  const file = formData.get('file') as File
  const documentType = formData.get('documentType') as string
  const description = formData.get('description') as string

  if (!providerId || !file) {
    return { error: 'Dados incompletos' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: 'Ficheiro demasiado grande (máx. 10MB)' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  // Generate unique filename
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `${providerId}/${timestamp}-${sanitizedName}`

  // Upload file to Supabase Storage
  const { error: uploadError } = await admin.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('Erro ao fazer upload:', uploadError)
    return { error: 'Erro ao fazer upload do ficheiro' }
  }

  // Get public URL
  const { data: urlData } = admin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  // Insert document record
  const { data: document, error: dbError } = await admin
    .from('provider_documents')
    .insert({
      provider_id: providerId,
      file_name: file.name,
      file_path: filePath,
      file_url: urlData.publicUrl,
      file_size: file.size,
      file_type: file.type,
      document_type: documentType || null,
      description: description || null,
      uploaded_by: user.id,
    })
    .select('id')
    .single()

  if (dbError) {
    console.error('Erro ao guardar documento:', dbError)
    // Try to delete the uploaded file
    await admin.storage.from(BUCKET_NAME).remove([filePath])
    return { error: 'Erro ao guardar documento' }
  }

  // Register in history
  await admin.from('history_log').insert({
    provider_id: providerId,
    event_type: 'document_uploaded',
    description: `Documento carregado: ${file.name}`,
    new_value: { file_name: file.name, document_type: documentType },
    created_by: user.id,
  })

  revalidatePath(`/providers/${providerId}`)

  return { success: true, documentId: document.id }
}

export async function deleteDocument(
  prevState: UploadDocumentState,
  formData: FormData
): Promise<UploadDocumentState> {
  const supabase = await createClient()

  const documentId = formData.get('documentId') as string

  if (!documentId) {
    return { error: 'Dados incompletos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const admin = createAdminClient()

  // Get document info
  const { data: document } = await admin
    .from('provider_documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (!document) {
    return { error: 'Documento não encontrado' }
  }

  // Delete from storage
  const { error: storageError } = await admin.storage
    .from(BUCKET_NAME)
    .remove([document.file_path])

  if (storageError) {
    console.error('Erro ao apagar ficheiro:', storageError)
  }

  // Delete from database
  const { error: dbError } = await admin
    .from('provider_documents')
    .delete()
    .eq('id', documentId)

  if (dbError) {
    console.error('Erro ao apagar documento:', dbError)
    return { error: 'Erro ao apagar documento' }
  }

  // Register in history
  await admin.from('history_log').insert({
    provider_id: document.provider_id,
    event_type: 'document_deleted',
    description: `Documento apagado: ${document.file_name}`,
    old_value: { file_name: document.file_name },
    created_by: user.id,
  })

  revalidatePath(`/providers/${document.provider_id}`)

  return { success: true }
}

export async function getProviderDocuments(providerId: string) {
  const { data, error } = await createAdminClient()
    .from('provider_documents')
    .select(`
      *,
      uploaded_by_user:users!provider_documents_uploaded_by_fkey(id, name, email)
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar documentos:', error)
    return []
  }

  return data || []
}
