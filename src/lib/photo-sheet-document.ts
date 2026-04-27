/**
 * Photo sheet PDF Storage + documents DB integration.
 *
 * This module provides:
 * - savePhotoSheetPdfToStorageAndCreateDocument: save PDF to Storage and create document record
 *
 * Documents table fields used:
 * - id (uuid, primary key)
 * - site_id (text)
 * - category (text)
 * - title (text)
 * - file_url (text, full public URL) — kept for existing documents UI compatibility
 * - file_type (text, nullable)
 * - required (boolean)
 * - uploaded_by (text, nullable)
 * - created_at (timestamptz)
 * - storage_bucket (text) — Storage bucket name, for signed URL transition
 * - storage_path (text) — Storage file path, for signed URL transition
 * - source_type (text) — Document source type, for deduplication and source tracking
 * - source_id (text) — Source record ID, for deduplication and source tracking
 *
 * NOTE: file_url is kept for backward compatibility with existing documents UI.
 * storage_bucket/storage_path are metadata for future signed URL preview/download.
 * source_type/source_id enable deduplication by source identity.
 *
 * This PR does NOT modify documents page or admin documents page.
 * Signed URL preview/download will be implemented in a subsequent PR.
 */

import type { PhotoSheetDraft } from './photo-sheet-mapping'
import { createClient } from './supabase/client'
import { savePhotoSheetPdfToStorage } from './photo-sheet-pdf'
import { resolvePublicUrl } from './storage/storage-helper'

/**
 * Build the public file URL for a reports bucket file.
 *
 * NOTE: Uses resolvePublicUrl for reports bucket public URL generation.
 * If reports bucket becomes private, this function must be updated to generate
 * signed URLs or the documents UI must be updated to use signed URLs.
 */
function buildReportsFileUrl(storagePath: string): string {
  const supabase = createClient()
  return resolvePublicUrl({ supabase, bucket: 'reports', path: storagePath }) ?? ''
}

/**
 * Build a deterministic source ID for photo sheet documents.
 * Format: photo-sheet:{siteId}:{workDate}
 *
 * This ID is used for deduplication and source tracking in the documents table.
 * It matches the storage path convention to ensure consistent identification.
 */
function buildPhotoSheetSourceId(draft: PhotoSheetDraft): string {
  return `photo-sheet:${draft.siteId}:${draft.workDate}`
}

/**
 * Save photo sheet PDF to Storage and create documents record.
 *
 * This function:
 * 1. Checks for existing locked/approved document BEFORE uploading
 * 2. Saves PDF to Storage reports bucket (via savePhotoSheetPdfToStorage)
 * 3. Generates public URL for the stored PDF
 * 4. Creates or returns an existing document record in the documents table
 *
 * Lock protection: If an approved or locked photo sheet exists for the same
 * siteId + workDate, throws an error to prevent accidental overwriting.
 *
 * @param input.draft - PhotoSheetDraft data to generate PDF from
 * @returns Promise with storage info and document ID
 *
 * @throws Error if a locked or approved document already exists
 *
 * @example
 * const result = await savePhotoSheetPdfToStorageAndCreateDocument({ draft })
 * // => { bucket: 'reports', path: 'site-123/2024-01-15/photo-sheet/...', fileUrl: '...', documentId: 'uuid' }
 */
export async function savePhotoSheetPdfToStorageAndCreateDocument(input: {
  draft: PhotoSheetDraft
}): Promise<{
  bucket: 'reports'
  path: string
  fileUrl: string
  documentId: string
}> {
  const { draft } = input

  // Step 0: Check for existing locked/approved document BEFORE uploading
  const sourceId = buildPhotoSheetSourceId(draft)
  const supabase = createClient()

  const { data: existingDoc, error: existingQueryError } = await supabase
    .from('documents')
    .select('id, approval_status, locked_at')
    .eq('source_type', 'photo_sheet')
    .eq('source_id', sourceId)
    .limit(1)

  if (existingQueryError) {
    throw new Error(`Failed to check existing document: ${existingQueryError.message}`)
  }

  // Block if document is locked or approved
  if (existingDoc && existingDoc.length > 0) {
    const doc = existingDoc[0]
    if (doc.locked_at) {
      throw new Error('이미 승인된 사진대지가 있어 다시 저장할 수 없습니다.')
    }
    if (doc.approval_status === 'approved') {
      throw new Error('이미 승인된 사진대지가 있어 다시 저장할 수 없습니다.')
    }
  }

  // Step 1: Save PDF to Storage
  const { bucket, path } = await savePhotoSheetPdfToStorage({ draft })

  // Step 2: Build public file URL
  // NOTE: documents table UI uses file_url directly for iframe/src and download.
  // If reports bucket is private, must update documents preview to use signed URLs.
  const fileUrl = buildReportsFileUrl(path)

  if (!fileUrl) {
    throw new Error('Failed to generate public URL for photo sheet PDF')
  }

  // Step 2: Check for existing document by URL (legacy fallback only)
  // Note: Existing doc check by source_type + source_id was done in Step 0 above
  const { data: existingByUrl, error: urlQueryError } = await supabase
    .from('documents')
    .select('id, approval_status, locked_at')
    .eq('site_id', draft.siteId)
    .eq('title', draft.title)
    .eq('file_url', fileUrl)
    .limit(1)

  if (urlQueryError) {
    throw new Error(`Failed to query existing documents by URL: ${urlQueryError.message}`)
  }

  // Return existing document ID if found by URL (only if not locked/approved)
  if (existingByUrl && existingByUrl.length > 0) {
    const urlDoc = existingByUrl[0]
    if (urlDoc.locked_at) {
      throw new Error('이미 승인된 사진대지가 있어 다시 저장할 수 없습니다.')
    }
    if (urlDoc.approval_status === 'approved') {
      throw new Error('이미 승인된 사진대지가 있어 다시 저장할 수 없습니다.')
    }
    return {
      bucket,
      path,
      fileUrl,
      documentId: urlDoc.id,
    }
  }

  // Step 3: Insert new record with storage metadata
  const { data: insertedDoc, error: insertError } = await supabase
    .from('documents')
    .insert({
      site_id: draft.siteId,
      category: '사진대지',
      title: draft.title,
      file_url: fileUrl,
      file_type: 'application/pdf',
      required: false,
      uploaded_by: null,
      storage_bucket: bucket,
      storage_path: path,
      source_type: 'photo_sheet',
      source_id: sourceId,
    })
    .select('id')
    .single()

  if (insertError) {
    throw new Error(`Failed to create document record: ${insertError.message}`)
  }

  return {
    bucket,
    path,
    fileUrl,
    documentId: insertedDoc.id,
  }
}
