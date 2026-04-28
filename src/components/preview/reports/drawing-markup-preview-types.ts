/**
 * Drawing markup preview types for read-only rendering.
 *
 * These types define the input data structure for DrawingMarkupMultiPagePreview.
 * They are NOT the database schema - only renderer input types.
 */

/**
 * A point with normalized coordinates (0 to 1).
 */
export type DrawingMarkupPoint = {
  x: number
  y: number
}

/**
 * A brush stroke mark consisting of connected points.
 */
export type DrawingMarkupBrushStroke = {
  type: 'brush'
  /** Array of points forming the stroke path */
  points: DrawingMarkupPoint[]
  /** Stroke width in normalized units (default: 0.01) */
  width?: number
  /** Stroke color as CSS color string (default: '#dc2626') */
  color?: string
}

/**
 * A polygon area mark with fill and stroke.
 */
export type DrawingMarkupPolygonArea = {
  type: 'polygon-area'
  /** Array of points forming the polygon vertices */
  points: DrawingMarkupPoint[]
  /** Stroke width in normalized units (default: 0.005) */
  lineWidth?: number
  /** Stroke color as CSS color string (default: '#dc2626') */
  strokeColor?: string
  /** Fill color as CSS color string (default: 'rgba(220, 38, 38, 0.2)') */
  fillColor?: string
}

/**
 * Union type for all supported mark types.
 */
export type DrawingMarkupMark =
  | DrawingMarkupBrushStroke
  | DrawingMarkupPolygonArea

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
