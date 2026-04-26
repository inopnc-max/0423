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
 * Photo status for worklog media attachments.
 */
export type WorklogMediaPhotoStatus = 'after_repair' | 'before_repair' | 'receipt' | 'other'

/**
 * Server-saved media info item structure.
 * Excludes local-only fields: file, blob, previewUrl, localBlobId
 */
export type WorklogMediaInfoItem = {
  id: string
  name: string
  kind: WorklogMediaKind
  mimeType: string
  size: number
  storageBucket: WorklogMediaBucket
  storagePath: string
  /** Photo status (only for 'photo' kind) */
  photoStatus?: WorklogMediaPhotoStatus
  /** Display status text (only for 'photo' kind) */
  displayStatus?: string
  createdAt: string
}

/**
 * Server-saved media info structure for daily_logs.media_info.
 */
export type WorklogMediaInfo = {
  attachments: WorklogMediaInfoItem[]
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

/**
 * Convert WorklogMediaAttachment array to WorklogMediaInfo for server storage.
 * Only includes attachments that have both storageBucket and storagePath.
 * Excludes local-only fields: file, blob, previewUrl, localBlobId
 */
export function buildWorklogMediaInfo(attachments: WorklogMediaAttachment[]): WorklogMediaInfo {
  const items: WorklogMediaInfoItem[] = []

  for (const attachment of attachments) {
    if (!attachment.storageBucket || !attachment.storagePath) {
      continue
    }

    const item: WorklogMediaInfoItem = {
      id: attachment.id,
      name: attachment.name,
      kind: attachment.kind,
      mimeType: attachment.mimeType,
      size: attachment.size,
      storageBucket: attachment.storageBucket,
      storagePath: attachment.storagePath,
      createdAt: attachment.createdAt,
    }

    if (attachment.kind === 'photo') {
      item.photoStatus = 'after_repair'
      item.displayStatus = '보수후'
    }

    items.push(item)
  }

  return { attachments: items }
}
