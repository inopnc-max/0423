/**
 * Drawing markup preview types for read-only rendering.
 *
 * These types define the input data structure for DrawingMarkupMultiPagePreview.
 * They are NOT the database schema - only renderer input types.
 *
 * Primitive mark types (DrawingMarkupMark, DrawingMarkupPoint, etc.)
 * are shared via @/lib/types/drawing-markup to avoid component -> lib imports.
 */

// Re-export primitives from shared location
export type {
  DrawingMarkupPoint,
  DrawingMarkupBrushStroke,
  DrawingMarkupPolygonArea,
  DrawingMarkupLine,
  DrawingMarkupArrow,
  DrawingMarkupRectangle,
  DrawingMarkupEllipse,
  DrawingMarkupText,
  DrawingMarkupMark,
} from '@/lib/types/drawing-markup'

// Import for local use in page/document types
import type { DrawingMarkupMark, DrawingMarkupPoint } from '@/lib/types/drawing-markup'

/**
 * Area calculation result for a polygon.
 */
export type AreaCalculation = {
  /** Area in square pixels (relative to viewBox 1000x1000) */
  rawArea: number
  /** Scaled area (normalized 0-1 range, suitable for display) */
  normalizedArea: number
  /** Area label for display (e.g., "25.4 m²") */
  displayLabel: string
  /** Whether the area was calculated successfully */
  isValid: boolean
}

/**
 * Calculate the area of a polygon using the Shoelace formula.
 * Coordinates are normalized (0-1 range).
 *
 * @param points - Array of polygon vertices
 * @returns AreaCalculation with raw, normalized, and display values
 */
export function calculatePolygonArea(points: DrawingMarkupPoint[]): AreaCalculation {
  if (!points || points.length < 3) {
    return { rawArea: 0, normalizedArea: 0, displayLabel: '-', isValid: false }
  }

  const n = points.length
  let sum = 0

  for (let i = 0; i < n; i++) {
    const current = points[i]
    const next = points[(i + 1) % n]
    sum += current.x * next.y
    sum -= next.x * current.y
  }

  const rawArea = Math.abs(sum) / 2

  if (rawArea === 0 || isNaN(rawArea)) {
    return { rawArea: 0, normalizedArea: 0, displayLabel: '-', isValid: false }
  }

  const normalizedArea = rawArea
  const displayLabel = `${normalizedArea.toFixed(2)} px²`

  return {
    rawArea,
    normalizedArea,
    displayLabel,
    isValid: true,
  }
}

/**
 * Calculate all polygon areas from an array of marks.
 * Returns a map of mark index to AreaCalculation.
 */
export function calculateAllPolygonAreas(marks: DrawingMarkupMark[]): Map<number, AreaCalculation> {
  const result = new Map<number, AreaCalculation>()

  marks.forEach((mark, index) => {
    if (mark.type === 'polygon-area') {
      result.set(index, calculatePolygonArea(mark.points))
    }
  })

  return result
}

/**
 * Format area for display with custom scale factor.
 * Common use case: multiplying by 10000 for m² if coordinates are in cm.
 *
 * @param area - Normalized area value
 * @param scaleFactor - Multiplier for display (e.g., 10000 for m² if in cm)
 * @param unit - Display unit string
 * @returns Formatted area string
 */
export function formatAreaForDisplay(
  area: number,
  scaleFactor: number = 1,
  unit: string = 'units²'
): string {
  const scaledArea = area * scaleFactor
  return `${scaledArea.toFixed(2)} ${unit}`
}

/**
 * A single page in a drawing markup document.
 */
export type DrawingMarkupPreviewPage = {
  /** Unique identifier for this page */
  id: string
  /** Display title for this page */
  title: string
  /** Direct image URL (fallback if no storage info) */
  imageUrl?: string | null
  /** Storage bucket name (if using Supabase storage) */
  storageBucket?: string | null
  /** Storage path (if using Supabase storage) */
  storagePath?: string | null
  /** Work date associated with this page */
  workDate?: string
  /** Label for the source/origin of this page */
  sourceLabel?: string
  /** Array of markup marks to render on this page */
  marks?: DrawingMarkupMark[]
}

/**
 * A drawing markup document containing multiple pages.
 */
export type DrawingMarkupPreviewDocument = {
  /** Document title */
  title: string
  /** Site identifier */
  siteId?: string
  /** Site name */
  siteName?: string
  /** Work date */
  workDate?: string
  /** Document status for badge display */
  status?: 'draft' | 'pending' | 'approved' | 'locked' | 'rejected'
  /** Array of pages in this document */
  pages: DrawingMarkupPreviewPage[]
}
