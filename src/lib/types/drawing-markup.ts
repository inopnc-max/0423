/**
 * Shared drawing markup primitive types.
 *
 * These types define the core mark data structures used across:
 * - preview renderer (DrawingMarkupMultiPagePreview)
 * - worklog media types (WorklogMediaAttachment, WorklogMediaInfoItem)
 * - any future drawing markup features (editor, export, etc.)
 *
 * This file lives in lib/types to avoid importing from component folders
 * into domain/lib layers.
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
 * A straight line between two normalized points.
 */
export type DrawingMarkupLine = {
  type: 'line'
  start: DrawingMarkupPoint
  end: DrawingMarkupPoint
  width?: number
  color?: string
}

/**
 * A directional arrow between two normalized points.
 */
export type DrawingMarkupArrow = {
  type: 'arrow'
  start: DrawingMarkupPoint
  end: DrawingMarkupPoint
  width?: number
  color?: string
}

/**
 * A rectangle defined by two opposite corners.
 */
export type DrawingMarkupRectangle = {
  type: 'rectangle'
  start: DrawingMarkupPoint
  end: DrawingMarkupPoint
  lineWidth?: number
  strokeColor?: string
  fillColor?: string
}

/**
 * An ellipse defined by a bounding box's opposite corners.
 */
export type DrawingMarkupEllipse = {
  type: 'ellipse'
  start: DrawingMarkupPoint
  end: DrawingMarkupPoint
  lineWidth?: number
  strokeColor?: string
  fillColor?: string
}

/**
 * A text annotation anchored at a normalized point.
 */
export type DrawingMarkupText = {
  type: 'text'
  position: DrawingMarkupPoint
  text: string
  fontSize?: number
  color?: string
}

/**
 * Union type for all supported mark types.
 */
export type DrawingMarkupMark =
  | DrawingMarkupBrushStroke
  | DrawingMarkupPolygonArea
  | DrawingMarkupLine
  | DrawingMarkupArrow
  | DrawingMarkupRectangle
  | DrawingMarkupEllipse
  | DrawingMarkupText

/**
 * Optional calibration metadata for future area calculation.
 *
 * This is a data contract only. Current editor/save flows do not create or
 * persist calibration data yet.
 */
export type DrawingMarkupScale = {
  mode: 'manual-ratio' | 'reference-line'
  unit: 'm' | 'mm'
  pageNo: number
  ratio?: {
    metersPerNormalizedX: number
    metersPerNormalizedY: number
  }
  referenceLine?: {
    start: DrawingMarkupPoint
    end: DrawingMarkupPoint
    realLengthMeters: number
  }
}

/**
 * Optional derived summary for future polygon area reporting.
 *
 * Marks plus scale remain the source of truth; this summary is only a cached
 * read model for review/export surfaces.
 */
export type DrawingMarkupAreaSummary = {
  rawNormalizedArea?: number
  areaM2?: number
  areaPyeong?: number
  calibrationId?: string
  calculatedAt?: string
}

/**
 * Future page-scoped mark group.
 */
export type DrawingMarkupPageGroup = {
  pageNo: number
  marks: DrawingMarkupMark[]
  scale?: DrawingMarkupScale
  areaSummary?: DrawingMarkupAreaSummary
}

/**
 * Canonical JSON shapes accepted from markup_json.
 *
 * The legacy shape is still DrawingMarkupMark[]. Future multipage data may be
 * stored as { pages: DrawingMarkupPageGroup[] } without breaking read paths.
 */
export type DrawingMarkupJson = DrawingMarkupMark[] | {
  pages: DrawingMarkupPageGroup[]
}

export function normalizeDrawingMarkupPageNo(pageNo?: number | null): number {
  return Math.max(1, Math.trunc(pageNo ?? 1))
}

export function normalizeDrawingMarkupPages(value: unknown): DrawingMarkupPageGroup[] {
  if (Array.isArray(value)) {
    return [{ pageNo: 1, marks: value as DrawingMarkupMark[] }]
  }

  if (!value || typeof value !== 'object') return []

  const pages = (value as { pages?: unknown }).pages
  if (!Array.isArray(pages)) return []

  const normalizedPages: DrawingMarkupPageGroup[] = []

  for (const page of pages) {
    if (!page || typeof page !== 'object') continue

    const pageValue = page as {
      pageNo?: unknown
      marks?: unknown
      scale?: DrawingMarkupScale
      areaSummary?: DrawingMarkupAreaSummary
    }
    const rawPageNo = typeof pageValue.pageNo === 'number' ? pageValue.pageNo : 1
    const marks = Array.isArray(pageValue.marks) ? (pageValue.marks as DrawingMarkupMark[]) : []
    const normalizedPage: DrawingMarkupPageGroup = {
      pageNo: normalizeDrawingMarkupPageNo(rawPageNo),
      marks,
    }

    if (pageValue.scale) {
      normalizedPage.scale = pageValue.scale
    }
    if (pageValue.areaSummary) {
      normalizedPage.areaSummary = pageValue.areaSummary
    }

    normalizedPages.push(normalizedPage)
  }

  return normalizedPages
}

export function normalizeDrawingMarkupMarks(value: unknown, pageNo = 1): DrawingMarkupMark[] {
  if (Array.isArray(value)) return value as DrawingMarkupMark[]

  const normalizedPageNo = normalizeDrawingMarkupPageNo(pageNo)
  const page = normalizeDrawingMarkupPages(value).find(item => item.pageNo === normalizedPageNo)

  return page?.marks ?? []
}
