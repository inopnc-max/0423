/**
 * Photo sheet draft types and conversion helpers.
 * Converts daily_logs.media_info into a structure suitable for photo sheet PDF generation.
 */

import type { WorklogMediaInfo, WorklogMediaPhotoStatus } from './worklog-media'

/**
 * Photo status mapping for photo sheet source.
 */
export type PhotoSheetSourceStatus = WorklogMediaPhotoStatus

/**
 * Single item in a photo sheet draft.
 */
export type PhotoSheetDraftItem = {
  /** Unique ID for this draft item */
  id: string
  /** Reference to the original media item ID in media_info */
  sourceMediaId: string
  /** Title for this item (usually derived from displayStatus) */
  title: string
  /** Original file name */
  fileName: string
  /** Storage bucket - always 'photos' for photo sheet items */
  storageBucket: 'photos'
  /** Storage path for accessing the file via Supabase Storage */
  storagePath: string
  /** Photo status from source */
  status: PhotoSheetSourceStatus
  /** Human-readable status label */
  statusLabel: string
  /** Caption text (task summary or status label) */
  caption: string
  /** Original creation timestamp */
  createdAt: string
}

/**
 * Complete photo sheet draft structure.
 */
export type PhotoSheetDraft = {
  /** Site ID from the worklog */
  siteId: string
  /** Work date from the worklog */
  workDate: string
  /** Title for the photo sheet */
  title: string
  /** Photo sheet items sorted by createdAt ascending */
  items: PhotoSheetDraftItem[]
}

/**
 * Convert WorklogMediaInfo to PhotoSheetDraft.
 *
 * Rules:
 * - Only includes attachments where kind === 'photo'
 * - Only includes attachments where storageBucket === 'photos'
 * - Only includes attachments where storagePath exists
 * - If photoStatus is missing, defaults to 'after_repair'
 * - If displayStatus is missing, defaults to '보수후'
 * - caption: uses taskSummary if provided, otherwise uses displayStatus
 * - title: `${siteName ?? '현장'} 사진대지`
 * - items sorted by createdAt ascending
 *
 * @param input - Parameters for building the photo sheet draft
 * @returns PhotoSheetDraft with filtered and transformed photo items
 */
export function buildPhotoSheetDraftFromMediaInfo(input: {
  siteId: string
  workDate: string
  siteName?: string
  taskSummary?: string
  mediaInfo: WorklogMediaInfo
}): PhotoSheetDraft {
  const { siteId, workDate, siteName, taskSummary, mediaInfo } = input

  const items: PhotoSheetDraftItem[] = []

  for (const attachment of mediaInfo.attachments) {
    // Filter: only photos in 'photos' bucket with storagePath
    if (attachment.kind !== 'photo') continue
    if (attachment.storageBucket !== 'photos') continue
    if (!attachment.storagePath) continue

    const photoStatus = attachment.photoStatus ?? 'after_repair'
    const statusLabel = attachment.displayStatus ?? '보수후'

    const item: PhotoSheetDraftItem = {
      id: crypto.randomUUID(),
      sourceMediaId: attachment.id,
      title: statusLabel,
      fileName: attachment.name,
      storageBucket: 'photos',
      storagePath: attachment.storagePath,
      status: photoStatus,
      statusLabel,
      caption: taskSummary ?? statusLabel,
      createdAt: attachment.createdAt,
    }

    items.push(item)
  }

  // Sort by createdAt ascending
  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return {
    siteId,
    workDate,
    title: `${siteName ?? '현장'} 사진대지`,
    items,
  }
}
