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
  DrawingMarkupMark,
} from '@/lib/types/drawing-markup'

// Import for local use in page/document types
import type { DrawingMarkupMark } from '@/lib/types/drawing-markup'

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
