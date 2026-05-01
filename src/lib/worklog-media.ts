/**
 * Worklog media attachment types and helpers.
 */

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
  photoStatus?: WorklogMediaPhotoStatus
  displayStatus?: string
  createdAt: string
}

export type WorklogMediaInfo = {
  attachments: WorklogMediaInfoItem[]
}

export function classifyWorklogMedia(file: File): WorklogMediaKind {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type === 'application/pdf') return 'drawing'
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

    items.push(item)
  }

  return { attachments: items }
}
