/**
 * Photo sheet PDF Storage + documents DB integration.
 *
 * This module provides:
 * - savePhotoSheetPdfToStorageAndCreateDocument: save PDF to Storage and create document record
 *
 * Uses documents table with these fields:
 * - id (uuid, primary key)
 * - site_id (text)
 * - category (text)
 * - title (text)
 * - file_url (text, full public URL)
 * - file_type (text, nullable)
 * - required (boolean)
 * - uploaded_by (text, nullable)
 * - created_at (timestamptz)
 *
 * NOTE: documents table currently uses file_url for iframe src and download href directly.
 * This helper stores public URLs for compatibility with existing documents UI.
 * If reports bucket is changed to private, documents preview/download must be updated
 * to use signed URLs in a subsequent PR. This PR does not modify documents page
 * or PreviewCenter.
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
 * Save photo sheet PDF to Storage and create documents record.
 *
 * This function:
 * 1. Saves PDF to Storage reports bucket (via savePhotoSheetPdfToStorage)
 * 2. Generates public URL for the stored PDF
 * 3. Creates or returns an existing document record in the documents table
 *
 * Deduplication: If a document with the same site_id + title + file_url exists,
 * returns the existing document ID without updating (documents table has no updated_at).
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

  // Step 3: Check for existing document record (deduplication by site_id + title + file_url)
  const supabase = createClient()
  const { data: existingDocs, error: queryError } = await supabase
    .from('documents')
    .select('id')
    .eq('site_id', draft.siteId)
    .eq('title', draft.title)
    .eq('file_url', fileUrl)
    .limit(1)

  if (queryError) {
    throw new Error(`Failed to query existing documents: ${queryError.message}`)
  }

  // Step 4: Return existing or insert new
  if (existingDocs && existingDocs.length > 0) {
    // Return existing document ID without update
    // NOTE: documents table has no updated_at column
    return {
      bucket,
      path,
      fileUrl,
      documentId: existingDocs[0].id,
    }
  }

  // Insert new record
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
