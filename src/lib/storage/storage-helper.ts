/**
 * Common Supabase Storage helpers for the app.
 *
 * This module provides:
 * - buildWorklogMediaStoragePath: pure function to generate storage paths
 * - uploadToStorage: generic upload helper
 * - createSignedPreviewUrl: signed URL generator for private buckets
 * - resolvePublicUrl: public URL resolver for public buckets
 *
 * All helpers accept a SupabaseClient instance (injected, not created internally)
 * to ensure browser-only client usage and proper auth context.
 *
 * NOTE: These are helper functions only. Actual upload/integration with Worklog
 * or other features will be implemented in subsequent PRs.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorklogMediaKind } from '../worklog-media'

/** MIME type to file extension fallback map */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
}

/**
 * Safely extract file extension from a filename.
 * Falls back to mimeType mapping or 'bin' if unknown.
 */
function extractExtension(fileName: string, mimeType: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot !== -1 && lastDot < fileName.length - 1) {
    const ext = fileName.slice(lastDot + 1).toLowerCase()
    if (ext.length >= 2 && ext.length <= 4) {
      return ext
    }
  }
  // Fallback via mimeType
  const mapped = MIME_TO_EXT[mimeType]
  if (mapped) return mapped
  // Generic fallback
  return 'bin'
}

export interface BuildWorklogMediaStoragePathInput {
  siteId: string
  workDate: string
  mediaId: string
  kind: WorklogMediaKind
  fileName: string
  /** MIME type for extension fallback when filename has no extension */
  mimeType?: string
}

/**
 * Build a deterministic storage path for worklog media attachments.
 *
 * Path conventions:
 * - photo:  photos/{siteId}/{workDate}/preview/{mediaId}.{ext}
 * - drawing: drawings/{siteId}/original/{mediaId}.{ext}
 * - other:   documents/{siteId}/site/{mediaId}.{ext}
 *
 * @example
 * const path = buildWorklogMediaStoragePath({
 *   siteId: 'site-123',
 *   workDate: '2024-01-15',
 *   mediaId: 'abc-def',
 *   kind: 'photo',
 *   fileName: 'image.jpg'
 * })
 * // => 'photos/site-123/2024-01-15/preview/abc-def.jpg'
 */
export function buildWorklogMediaStoragePath(input: BuildWorklogMediaStoragePathInput): string {
  const { siteId, workDate, mediaId, kind, fileName, mimeType } = input
  const ext = extractExtension(fileName, mimeType ?? '')

  switch (kind) {
    case 'photo':
      return `photos/${siteId}/${workDate}/preview/${mediaId}.${ext}`
    case 'drawing':
      return `drawings/${siteId}/original/${mediaId}.${ext}`
    case 'other':
    default:
      return `documents/${siteId}/site/${mediaId}.${ext}`
  }
}

export type WorklogMediaBucket = 'photos' | 'drawings' | 'documents'

export interface BuildWorklogMediaStorageTargetResult {
  bucket: WorklogMediaBucket
  path: string
}

/**
 * Build storage bucket and path for worklog media attachments.
 *
 * @example
 * const target = buildWorklogMediaStorageTarget({
 *   siteId: 'site-123',
 *   workDate: '2024-01-15',
 *   mediaId: 'abc-def',
 *   kind: 'photo',
 *   fileName: 'image.jpg',
 * })
 * // => { bucket: 'photos', path: 'site-123/2024-01-15/preview/abc-def.jpg' }
 */
export function buildWorklogMediaStorageTarget(input: BuildWorklogMediaStoragePathInput): BuildWorklogMediaStorageTargetResult {
  const { siteId, workDate, mediaId, kind, fileName, mimeType } = input
  const ext = extractExtension(fileName, mimeType ?? '')

  switch (kind) {
    case 'photo':
      return { bucket: 'photos', path: `${siteId}/${workDate}/preview/${mediaId}.${ext}` }
    case 'drawing':
      return { bucket: 'drawings', path: `${siteId}/original/${mediaId}.${ext}` }
    case 'other':
    default:
      return { bucket: 'documents', path: `${siteId}/site/${mediaId}.${ext}` }
  }
}

export interface UploadToStorageInput {
  supabase: SupabaseClient
  bucket: string
  path: string
  blob: Blob
  contentType?: string
  upsert?: boolean
}

export interface UploadToStorageResult {
  path: string
}

/**
 * Upload a blob to Supabase Storage.
 *
 * @param input.supabase - SupabaseClient instance (browser client)
 * @param input.bucket  - Storage bucket name
 * @param input.path    - Target path within the bucket
 * @param input.blob    - File/blob to upload
 * @param input.contentType - MIME type (defaults to 'application/octet-stream')
 * @param input.upsert  - Whether to overwrite existing file (default: true)
 *
 * @throws Error if upload fails
 *
 * @example
 * const { path } = await uploadToStorage({
 *   supabase,
 *   bucket: 'worklog-media',
 *   path: 'photos/site-123/2024-01-15/preview/abc-def.jpg',
 *   blob: fileObject,
 *   contentType: 'image/jpeg',
 * })
 */
export async function uploadToStorage(input: UploadToStorageInput): Promise<UploadToStorageResult> {
  const { supabase, bucket, path, blob, contentType = 'application/octet-stream', upsert = true } = input

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      contentType,
      upsert,
    })

  if (error) {
    throw new Error(`Failed to upload to storage: ${error.message}`)
  }

  return { path }
}

export interface CreateSignedPreviewUrlInput {
  supabase: SupabaseClient
  bucket: string
  path: string
  expiresIn?: number
}

/**
 * Create a signed preview URL for a private storage file.
 *
 * @param input.supabase  - SupabaseClient instance
 * @param input.bucket    - Storage bucket name
 * @param input.path      - File path within the bucket
 * @param input.expiresIn - URL expiration in seconds (default: 3600 / 1 hour)
 *
 * @returns Signed URL string, or null if creation fails
 *
 * @example
 * const url = await createSignedPreviewUrl({
 *   supabase,
 *   bucket: 'worklog-media',
 *   path: 'photos/site-123/2024-01-15/preview/abc-def.jpg',
 *   expiresIn: 3600,
 * })
 */
export async function createSignedPreviewUrl(
  input: CreateSignedPreviewUrlInput
): Promise<string | null> {
  const { supabase, bucket, path, expiresIn = 3600 } = input

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error || !data) {
    console.warn('[storage-helper] failed to create signed URL:', error?.message)
    return null
  }

  return data.signedUrl
}

export interface ResolvePublicUrlInput {
  supabase: SupabaseClient
  bucket: string
  path: string
}

/**
 * Resolve the public URL for a file in a public storage bucket.
 *
 * Use this when the bucket is configured as public.
 * For private buckets, prefer createSignedPreviewUrl instead.
 *
 * @param input.supabase - SupabaseClient instance
 * @param input.bucket   - Storage bucket name
 * @param input.path     - File path within the bucket
 *
 * @returns Public URL string, or null if resolution fails
 *
 * @example
 * const url = resolvePublicUrl({
 *   supabase,
 *   bucket: 'worklog-media',
 *   path: 'photos/site-123/2024-01-15/preview/abc-def.jpg',
 * })
 */
export function resolvePublicUrl(input: ResolvePublicUrlInput): string | null {
  const { supabase, bucket, path } = input

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)

  if (!data?.publicUrl) {
    console.warn('[storage-helper] failed to resolve public URL for:', path)
    return null
  }

  return data.publicUrl
}
