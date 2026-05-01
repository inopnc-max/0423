/**
 * Converts WorklogMediaInfo drawing attachments into DrawingMarkupPreviewDocument.
 *
 * Used by WorklogDetailView to open read-only drawing markup preview.
 * No editing or saving is implemented here.
 */

import type { WorklogMediaInfo } from './worklog-media'
import type { DrawingMarkupPreviewDocument } from '@/components/preview/reports/drawing-markup-preview-types'

interface BuildDrawingMarkupPreviewInput {
  siteId: string
  siteName?: string
  workDate: string
  title?: string
  mediaInfo: WorklogMediaInfo
}

/**
 * Filter drawing attachments from media_info and convert to DrawingMarkupPreviewDocument.
 * Returns null when no drawing attachments exist.
 *
 * marks are sourced from WorklogMediaInfoItem.marks (optional DrawingMarkupMark[]).
 * imageUrl is sourced from WorklogMediaInfoItem.imageUrl as a signed URL fallback.
 */
export function buildDrawingMarkupPreviewFromMediaInfo(
  input: BuildDrawingMarkupPreviewInput
): DrawingMarkupPreviewDocument | null {
  if (!input.mediaInfo || !Array.isArray(input.mediaInfo.attachments)) {
    return null
  }

  const drawings = input.mediaInfo.attachments.filter(
    item =>
      item.kind === 'drawing' &&
      item.storageBucket === 'drawings' &&
      typeof item.storagePath === 'string' &&
      item.storagePath.length > 0
  )

  if (drawings.length === 0) return null

  return {
    title: input.title ?? `${input.siteName ?? '현장'} 도면마킹`,
    siteId: input.siteId,
    siteName: input.siteName,
    workDate: input.workDate,
    status: 'draft',
    pages: drawings.map((item, index) => ({
      id: `drawing-preview:${item.id}`,
      title: item.name || `도면 ${index + 1}`,
      storageBucket: item.storageBucket,
      storagePath: item.storagePath,
      workDate: input.workDate,
      sourceLabel: '작업일지 첨부',
      marks: item.marks ?? [],
      imageUrl: item.imageUrl,
    })),
  }
}
