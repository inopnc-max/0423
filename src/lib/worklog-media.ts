/**
 * Worklog media attachment types and helpers.
 */

import type { DrawingMarkupMark } from '@/lib/types/drawing-markup'

export type WorklogMediaKind = 'photo' | 'drawing' | 'other'

export type WorklogMediaBucket = 'photos' | 'drawings' | 'documents'

export type WorklogMediaPhotoStatus = 'after_repair' | 'before_repair' | 'receipt' | 'other'

export type WorklogMediaAttachment = {
  id: string
  name: string
  kind: WorklogMediaKind
  mimeType: string
  size: number
  previewUrl?: string
  storageBucket?: WorklogMediaBucket
  storagePath?: string
  localBlobId?: string
  photoStatus?: WorklogMediaPhotoStatus
  displayStatus?: string
  /** Markup marks (only for 'drawing' kind) */
  marks?: DrawingMarkupMark[]
  /** Direct image URL fallback (only for 'drawing' kind) */
  imageUrl?: string | null
  createdAt: string
}

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
  /** Markup marks (only for 'drawing' kind) */
  marks?: DrawingMarkupMark[]
  /** Direct image URL fallback (only for 'drawing' kind, overrides signed URL) */
  imageUrl?: string | null
  createdAt: string
}

export type WorklogMediaInfo = {
  attachments: WorklogMediaInfoItem[]
}

export function classifyWorklogMedia(file: File): WorklogMediaKind {
  const fileName = file.name.toLowerCase()

  if (file.type.startsWith('image/')) return 'photo'
  if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) return 'drawing'
  return 'other'
}

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

export function buildWorklogMediaInfo(attachments: WorklogMediaAttachment[]): WorklogMediaInfo {
  const items: WorklogMediaInfoItem[] = []

  for (const attachment of attachments) {
    if (!attachment.storageBucket || !attachment.storagePath) continue

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
      item.photoStatus = attachment.photoStatus ?? 'after_repair'
      item.displayStatus = attachment.displayStatus ?? '보수후'
    }

    if (attachment.kind === 'drawing') {
      if (attachment.marks && attachment.marks.length > 0) {
        item.marks = attachment.marks
      }
      if (attachment.imageUrl) {
        item.imageUrl = attachment.imageUrl
      }
    }

    items.push(item)
  }

  return { attachments: items }
}
