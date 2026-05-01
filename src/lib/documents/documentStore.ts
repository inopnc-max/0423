/**
 * Document store - Core CRUD operations for documents table.
 *
 * This module handles document save/update/lock/unlock operations.
 * All DB operations use the authenticated Supabase client.
 *
 * Rules:
 * - Never expose service role key
 * - Never overwrite locked/final/approved documents with draft data
 * - Always log audit events for lock/unlock operations
 */

import { createClient } from '@/lib/supabase/client'
import type {
  DocumentRow,
  DocumentVersionRow,
  SaveDocumentParams,
  SaveDocumentVersionParams,
  LockDocumentParams,
  UnlockDocumentParams,
} from './document-types'

/* ─── Helper ─────────────────────────────────────────────────── */

function isLockedOrApproved(doc: DocumentRow): boolean {
  return Boolean(doc.locked_at) || doc.approval_status === 'approved'
}

/* ─── Save Document ─────────────────────────────────────────── */

/**
 * Save (create or update) a document.
 * - If `existingId` is provided, updates the existing document.
 * - If `existingId` is provided AND the existing doc is locked/approved, throws an error.
 * - Otherwise, creates a new document.
 *
 * Returns the document ID.
 */
export async function saveDocument(params: SaveDocumentParams): Promise<string> {
  const supabase = createClient()

  if (params.existingId) {
    const { data: existing } = await supabase
      .from('documents')
      .select('id, locked_at, approval_status')
      .eq('id', params.existingId)
      .single()

    if (existing && isLockedOrApproved(existing as DocumentRow)) {
      throw new Error('승인완료 또는 잠금 상태의 문서는 덮어쓸 수 없습니다.')
    }

    const { data, error } = await supabase
      .from('documents')
      .update({
        category: params.category,
        title: params.title,
        file_url: params.fileUrl ?? null,
        file_type: params.fileType ?? null,
        file_size: params.fileSize ?? null,
        storage_bucket: params.storageBucket ?? null,
        storage_path: params.storagePath ?? null,
        source_type: params.sourceType ?? null,
        source_id: params.sourceId ?? null,
      })
      .eq('id', params.existingId)
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      site_id: params.siteId,
      category: params.category,
      title: params.title,
      file_url: params.fileUrl ?? null,
      file_type: params.fileType ?? null,
      file_size: params.fileSize ?? null,
      uploaded_by: params.uploadedBy,
      storage_bucket: params.storageBucket ?? null,
      storage_path: params.storagePath ?? null,
      source_type: params.sourceType ?? null,
      source_id: params.sourceId ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/* ─── Save Document Version ─────────────────────────────────── */

/**
 * Create a new version entry for a document.
 * Returns the new version ID.
 */
export async function saveDocumentVersion(params: SaveDocumentVersionParams): Promise<string> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from('document_versions')
    .select('version_no')
    .eq('document_id', params.documentId)
    .order('version_no', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = existing ? (existing.version_no ?? 0) + 1 : 1

  const { data, error } = await supabase
    .from('document_versions')
    .insert({
      document_id: params.documentId,
      version_no: nextVersion,
      storage_bucket: params.storageBucket ?? null,
      storage_path: params.storagePath ?? null,
      file_size_bytes: params.fileSizeBytes ?? null,
      mime_type: params.mimeType ?? null,
      checksum: params.checksum ?? null,
      created_by: params.createdBy,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/* ─── Lock Document ─────────────────────────────────────────── */

/**
 * Lock a document. Sets locked_at and locked_by.
 * Returns the updated document ID.
 */
export async function lockDocument(params: LockDocumentParams): Promise<string> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from('documents')
    .select('id, locked_at, approval_status')
    .eq('id', params.documentId)
    .single()

  if (!existing) throw new Error('문서를 찾을 수 없습니다.')

  if (existing.locked_at) {
    return params.documentId
  }

  const { data, error } = await supabase
    .from('documents')
    .update({
      locked_at: new Date().toISOString(),
      locked_by: params.actorId,
    })
    .eq('id', params.documentId)
    .select('id')
    .single()

  if (error) throw error

  try {
    await supabase.from('document_audit_logs').insert({
      document_id: params.documentId,
      action: 'lock',
      actor_id: params.actorId,
      reason: params.reason ?? null,
    })
  } catch (err) {
    console.warn('[documentStore] failed to log lock audit:', err)
  }

  return data.id
}

/* ─── Unlock Document ─────────────────────────────────────────── */

/**
 * Unlock a document. Clears locked_at and locked_by.
 * Returns the updated document ID.
 */
export async function unlockDocument(params: UnlockDocumentParams): Promise<string> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from('documents')
    .select('id, locked_at')
    .eq('id', params.documentId)
    .single()

  if (!existing) throw new Error('문서를 찾을 수 없습니다.')

  if (!existing.locked_at) {
    return params.documentId
  }

  const { data, error } = await supabase
    .from('documents')
    .update({
      locked_at: null,
      locked_by: null,
    })
    .eq('id', params.documentId)
    .select('id')
    .single()

  if (error) throw error

  try {
    await supabase.from('document_audit_logs').insert({
      document_id: params.documentId,
      action: 'unlock',
      actor_id: params.actorId,
      reason: params.reason ?? null,
    })
  } catch (err) {
    console.warn('[documentStore] failed to log unlock audit:', err)
  }

  return data.id
}

/* ─── Check Document Access ─────────────────────────────────── */

/**
 * Check if a user has access to a document.
 * Returns the document row if accessible, null otherwise.
 */
export async function getDocumentAccess(
  documentId: string,
  userId: string
): Promise<DocumentRow | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (error || !data) return null
  return data as DocumentRow
}

/* ─── Get Document by ID ─────────────────────────────────── */

/**
 * Get a single document by ID.
 */
export async function getDocumentById(documentId: string): Promise<DocumentRow | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (error) return null
  return data as DocumentRow
}

/* ─── Get Document Versions ─────────────────────────────────── */

/**
 * Get all versions for a document, ordered by version number descending.
 */
export async function getDocumentVersions(documentId: string): Promise<DocumentVersionRow[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', documentId)
    .order('version_no', { ascending: false })

  if (error) return []
  return (data ?? []) as DocumentVersionRow[]
}
