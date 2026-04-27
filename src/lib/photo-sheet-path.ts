/**
 * Photo sheet storage path and source ID helper functions.
 *
 * This module provides pure helper functions for:
 * - Sanitizing path segments for safe Storage paths
 * - Building deterministic storage paths for photo sheet PDFs
 * - Building download filenames
 * - Building source IDs for document deduplication
 *
 * This file is a pure utility module with NO external dependencies:
 * - No Supabase imports
 * - No browser/DOM APIs
 * - No PDF/html2canvas/jsPDF imports
 * - No React imports
 */

export function sanitizePhotoSheetPathSegment(segment: string): string {
  return segment
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

export function buildPhotoSheetReportId(input: {
  siteId?: string | null
  workDate?: string | null
}): string {
  const safeSiteId = sanitizePhotoSheetPathSegment(input.siteId || 'unknown')
  const safeWorkDate = sanitizePhotoSheetPathSegment(input.workDate || 'unknown')
  return `photo-sheet-${safeSiteId}-${safeWorkDate}`
}

export function buildPhotoSheetStoragePath(input: {
  siteId?: string | null
  workDate?: string | null
}): string {
  const safeSiteId = sanitizePhotoSheetPathSegment(input.siteId || 'unknown')
  const safeWorkDate = sanitizePhotoSheetPathSegment(input.workDate || 'unknown')
  const reportId = buildPhotoSheetReportId({ siteId: input.siteId, workDate: input.workDate })
  return `${safeSiteId}/${safeWorkDate}/photo-sheet/${reportId}.pdf`
}

export function buildPhotoSheetDownloadFilename(input: {
  siteId?: string | null
  workDate?: string | null
}): string {
  const safeSiteId = sanitizePhotoSheetPathSegment(input.siteId || 'unknown')
  const safeWorkDate = sanitizePhotoSheetPathSegment(input.workDate || 'unknown')
  return `photo-sheet-${safeSiteId}-${safeWorkDate}.pdf`
}

export function buildPhotoSheetSourceId(input: {
  siteId: string
  workDate: string
}): string {
  return `photo-sheet:${input.siteId}:${input.workDate}`
}
