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
 * 1. Saves PDF to Storage reports bucket (via savePhotoSheetPdfToStorage)
 * 2. Generates public URL for the stored PDF
 * 3. Creates or returns an existing document record in the documents table
 *
 * Deduplication: First checks by source_type + source_id, then falls back to
 * site_id + title + file_url. Returns the existing document ID without updating
 * (documents table has no updated_at column).
 *
 * @param input.draft - PhotoSheetDraft data to generate PDF from
 * @returns Promise with storage info and document ID
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

  // Step 1: Save PDF to Storage
  const { bucket, path } = await savePhotoSheetPdfToStorage({ draft })

  // Step 2: Build public file URL
  // NOTE: documents table UI uses file_url directly for iframe/src and download.
  // If reports bucket is private, must update documents preview to use signed URLs.
  const fileUrl = buildReportsFileUrl(path)

  if (!fileUrl) {
    throw new Error('Failed to generate public URL for photo sheet PDF')
  }

  // Step 3: Build source ID for deduplication
  const sourceId = buildPhotoSheetSourceId(draft)

  // Step 4: Check for existing document record by source_type + source_id (primary)
  const supabase = createClient()

  const { data: existingBySource, error: sourceQueryError } = await supabase
    .from('documents')
    .select('id')
    .eq('source_type', 'photo_sheet')
    .eq('source_id', sourceId)
    .limit(1)

  if (sourceQueryError) {
    throw new Error(`Failed to query existing documents by source: ${sourceQueryError.message}`)
  }

  // Return existing document ID if found by source
  if (existingBySource && existingBySource.length > 0) {
    // NOTE: documents table has no updated_at column
    return {
      bucket,
      path,
      fileUrl,
      documentId: existingBySource[0].id,
    }
  }

  // Fallback: Check by site_id + title + file_url (for legacy records)
  const { data: existingByUrl, error: urlQueryError } = await supabase
    .from('documents')
    .select('id')
    .eq('site_id', draft.siteId)
    .eq('title', draft.title)
    .eq('file_url', fileUrl)
    .limit(1)

  if (urlQueryError) {
    throw new Error(`Failed to query existing documents by URL: ${urlQueryError.message}`)
  }

  // Return existing document ID if found by URL
  if (existingByUrl && existingByUrl.length > 0) {
    // NOTE: documents table has no updated_at column
    return {
      bucket,
      path,
      fileUrl,
      documentId: existingByUrl[0].id,
    }
  }

  // Step 5: Insert new record with storage metadata
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
