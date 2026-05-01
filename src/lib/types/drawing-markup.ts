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
 * Union type for all supported mark types.
 */
export type DrawingMarkupMark =
  | DrawingMarkupBrushStroke
  | DrawingMarkupPolygonArea
