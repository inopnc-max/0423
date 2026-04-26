/**
 * Worklog media attachment types and helpers.
 * This module defines the saved/serializable structure for worklog media files.
 * Actual upload (Supabase Storage or IndexedDB blob) is deferred to a later PR.
 */

export type WorklogMediaKind = 'photo' | 'drawing' | 'other'

export type WorklogMediaBucket = 'photos' | 'drawings' | 'documents'

export type WorklogMediaAttachment = {
  id: string
  name: string
  kind: WorklogMediaKind
  mimeType: string
  size: number
  /** Optional preview URL — populated when file is selected locally */
  previewUrl?: string
  /** Storage bucket after upload to Supabase Storage */
  storageBucket?: WorklogMediaBucket
  /** Storage path after upload to Supabase Storage */
  storagePath?: string
  /** IndexedDB blob key (used before storage upload) */
  localBlobId?: string
  createdAt: string
}

/**
 * Classify a File as a WorklogMediaKind based on its MIME type.
 */
export function classifyWorklogMedia(file: File): WorklogMediaKind {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type === 'application/pdf') return 'drawing'
  return 'other'
}

/**
 * Create a WorklogMediaAttachment metadata object from a File.
 * Does NOT store the File object itself — only serializable metadata.
 * previewUrl is intentionally omitted here; callers should add it if needed for local UI.
 */
export function createWorklogMediaAttachment(file: File): WorklogMediaAttachment {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    kind: classifyWorklogMedia(file),
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    createdAt: new Date().toISOString(),
  }
}
