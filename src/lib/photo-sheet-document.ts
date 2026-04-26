/**
 * Photo sheet PDF Storage + documents DB integration.
 *
 * This module provides:
 * - savePhotoSheetPdfToStorageAndCreateDocument: save PDF to Storage and create/update document record
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
 */

import type { PhotoSheetDraft } from './photo-sheet-mapping'
import { createClient } from './supabase/client'
import { savePhotoSheetPdfToStorage } from './photo-sheet-pdf'
import { resolvePublicUrl } from './storage/storage-helper'

/**
 * Build the public file URL for a reports bucket file.
 */
function buildReportsFileUrl(storagePath: string): string {
  const supabase = createClient()
  return resolvePublicUrl({ supabase, bucket: 'reports', path: storagePath }) ?? ''
}

/**
 * Save photo sheet PDF to Storage and create/update documents record.
 *
 * This function:
 * 1. Saves PDF to Storage reports bucket (via savePhotoSheetPdfToStorage)
 * 2. Generates public URL for the stored PDF
 * 3. Creates or updates a document record in the documents table
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

  // Step 4: Update existing or insert new
  if (existingDocs && existingDocs.length > 0) {
    // Update existing record
    const existingDoc = existingDocs[0]
    const { error: updateError } = await supabase
      .from('documents')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', existingDoc.id)

    if (updateError) {
      throw new Error(`Failed to update document record: ${updateError.message}`)
    }

    return {
      bucket,
      path,
      fileUrl,
      documentId: existingDoc.id,
    }
  } else {
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
}
