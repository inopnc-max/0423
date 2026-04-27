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
 * Sanitize path segment by removing invalid characters.
 * Mirrors photo-sheet-pdf.ts buildPhotoSheetStoragePath logic.
 */
function sanitizePathSegment(segment: string): string {
  return segment
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

/**
 * Build the expected storage path for a photo sheet PDF.
 * Must match photo-sheet-pdf.ts buildPhotoSheetStoragePath() exactly.
 * Format: {siteId}/{workDate}/photo-sheet/{reportId}.pdf
 */
function buildExpectedStoragePath(draft: PhotoSheetDraft): string {
  const safeSiteId = sanitizePathSegment(draft.siteId || 'unknown')
  const safeWorkDate = sanitizePathSegment(draft.workDate || 'unknown')
  const reportId = `photo-sheet-${safeSiteId}-${safeWorkDate}`
  return `${safeSiteId}/${safeWorkDate}/photo-sheet/${reportId}.pdf`
}

/**
 * Save photo sheet PDF to Storage and create documents record.
 *
 * This function:
 * 1. Checks for existing locked/approved document by source_id BEFORE uploading
 * 2. Checks for existing locked/approved document by legacy URL BEFORE uploading
 * 3. Saves PDF to Storage reports bucket (via savePhotoSheetPdfToStorage)
 * 4. Creates or returns an existing document record in the documents table
 *
 * Lock protection: If an approved or locked photo sheet exists for the same
 * siteId + workDate (by source_id or legacy URL), throws an error to prevent
 * accidental overwriting.
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
  const sourceId = buildPhotoSheetSourceId(draft)
  const expectedPath = buildExpectedStoragePath(draft)
  const supabase = createClient()

  // Step 1: Build expected file URL (to check legacy documents before upload)
  const expectedFileUrl = buildReportsFileUrl(expectedPath)

  // Step 2: Check for existing locked/approved document by source_id (before upload)
  const { data: existingBySource, error: sourceQueryError } = await supabase
    .from('documents')
    .select('id, approval_status, locked_at')
    .eq('source_type', 'photo_sheet')
    .eq('source_id', sourceId)
    .limit(1)

  if (sourceQueryError) {
    throw new Error(`Failed to check existing document by source: ${sourceQueryError.message}`)
  }

  if (existingBySource && existingBySource.length > 0) {
    const doc = existingBySource[0]
    if (doc.locked_at || doc.approval_status === 'approved') {
      throw new Error('이미 승인된 사진대지가 있어 다시 저장할 수 없습니다.')
    }
  }

  // Step 3: Check for existing locked/approved document by legacy URL (before upload)
  if (expectedFileUrl) {
    const { data: existingByUrl, error: urlQueryError } = await supabase
      .from('documents')
      .select('id, approval_status, locked_at')
      .eq('site_id', draft.siteId)
      .eq('title', draft.title)
      .eq('file_url', expectedFileUrl)
      .limit(1)

    if (urlQueryError) {
      throw new Error(`Failed to check existing document by URL: ${urlQueryError.message}`)
    }

    if (existingByUrl && existingByUrl.length > 0) {
      const urlDoc = existingByUrl[0]
      if (urlDoc.locked_at || urlDoc.approval_status === 'approved') {
        throw new Error('이미 승인된 사진대지가 있어 다시 저장할 수 없습니다.')
      }
    }
  }

  // Step 4: Save PDF to Storage (all pre-checks passed)
  const { bucket, path } = await savePhotoSheetPdfToStorage({ draft })

  // Step 5: Build actual public file URL
  const fileUrl = buildReportsFileUrl(path)

  if (!fileUrl) {
    throw new Error('Failed to generate public URL for photo sheet PDF')
  }

  // Step 6: Return existing document ID if found by legacy URL (after upload, not locked/approved)
  if (expectedFileUrl && fileUrl !== expectedFileUrl) {
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

    if (existingByUrl && existingByUrl.length > 0) {
      const urlDoc = existingByUrl[0]
      if (urlDoc.locked_at || urlDoc.approval_status === 'approved') {
        throw new Error('이미 승인된 사진대지가 있어 다시 저장할 수 없습니다.')
      }
      return {
        bucket,
        path,
        fileUrl,
        documentId: urlDoc.id,
      }
    }
  }

  // Step 7: Insert new record with storage metadata
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
