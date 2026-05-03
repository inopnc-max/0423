'use client'

import type { PointerEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Circle,
  Edit3,
  Highlighter,
  MousePointer2,
  PenLine,
  Square,
  Type,
} from 'lucide-react'
import type { DrawingMarkupMark, DrawingMarkupPoint } from '@/lib/types/drawing-markup'

export type DrawingMarkingTool =
  | 'select'
  | 'brush'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'polygon-area'

export interface DrawingMarkingOverlayProps {
  imageUrl?: string | null
  imageAlt?: string
  previewKind?: 'image' | 'pdf'
  marks: DrawingMarkupMark[]
  activeTool: DrawingMarkingTool
  onActiveToolChange?: (tool: DrawingMarkingTool) => void
  onMarksChange?: (marks: DrawingMarkupMark[]) => void
  readOnly?: boolean
  disabled?: boolean
  className?: string
}

const VIEW_BOX_SIZE = 1000
const DEFAULT_COLOR = '#dc2626'
const MIN_VISIBLE_DELTA = 0.018
const MIN_BRUSH_STEP = 0.004

const TOOL_ITEMS: Array<{
  tool: DrawingMarkingTool
  label: string
  icon: typeof MousePointer2
}> = [
  { tool: 'select', label: '선택', icon: MousePointer2 },
  { tool: 'brush', label: '브러시', icon: Highlighter },
  { tool: 'line', label: '선', icon: PenLine },
  { tool: 'arrow', label: '화살표', icon: ArrowUpRight },
  { tool: 'rectangle', label: '사각형', icon: Square },
  { tool: 'ellipse', label: '원형', icon: Circle },
  { tool: 'text', label: '텍스트', icon: Type },
  { tool: 'polygon-area', label: '영역', icon: Edit3 },
]

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function toViewBoxPoint(point: DrawingMarkupPoint): { x: number; y: number } {
  return {
    x: Math.round(clamp01(point.x) * VIEW_BOX_SIZE),
    y: Math.round(clamp01(point.y) * VIEW_BOX_SIZE),
  }
}

function getPointerPoint(event: PointerEvent<HTMLDivElement>, element: HTMLDivElement): DrawingMarkupPoint {
  const rect = element.getBoundingClientRect()

  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  }
}

function getBox(start: DrawingMarkupPoint, end: DrawingMarkupPoint) {
  const startPoint = toViewBoxPoint(start)
  const endPoint = toViewBoxPoint(end)
  const x = Math.min(startPoint.x, endPoint.x)
  const y = Math.min(startPoint.y, endPoint.y)
  const width = Math.abs(endPoint.x - startPoint.x)
  const height = Math.abs(endPoint.y - startPoint.y)

  return { x, y, width, height }
}

function getDistance(start: DrawingMarkupPoint, end: DrawingMarkupPoint): number {
  const dx = end.x - start.x
  const dy = end.y - start.y

  return Math.sqrt(dx * dx + dy * dy)
}

function ensureVisibleEnd(start: DrawingMarkupPoint, end: DrawingMarkupPoint): DrawingMarkupPoint {
  if (getDistance(start, end) >= MIN_VISIBLE_DELTA) return end

  return {
    x: clamp01(start.x + MIN_VISIBLE_DELTA),
    y: clamp01(start.y + MIN_VISIBLE_DELTA),
  }
}

function buildBoxPoints(start: DrawingMarkupPoint, end: DrawingMarkupPoint): DrawingMarkupPoint[] {
  const visibleEnd = ensureVisibleEnd(start, end)

  return [
    { x: start.x, y: start.y },
    { x: visibleEnd.x, y: start.y },
    { x: visibleEnd.x, y: visibleEnd.y },
    { x: start.x, y: visibleEnd.y },
  ]
}

function buildArrowHead(start: DrawingMarkupPoint, end: DrawingMarkupPoint): string {
  const startPoint = toViewBoxPoint(start)
  const endPoint = toViewBoxPoint(end)
  const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x)
  const size = 26
  const wingAngle = Math.PI / 7

  const left = {
    x: endPoint.x - size * Math.cos(angle - wingAngle),
    y: endPoint.y - size * Math.sin(angle - wingAngle),
  }
  const right = {
    x: endPoint.x - size * Math.cos(angle + wingAngle),
    y: endPoint.y - size * Math.sin(angle + wingAngle),
  }

  return `${endPoint.x},${endPoint.y} ${Math.round(left.x)},${Math.round(left.y)} ${Math.round(right.x)},${Math.round(right.y)}`
}

function renderMark(mark: DrawingMarkupMark, index: number, isDraft = false) {
  const opacity = isDraft ? 0.72 : 1

  if (mark.type === 'brush') {
    const points = mark.points
      .map(toViewBoxPoint)
      .map((point) => `${point.x},${point.y}`)
      .join(' ')

    if (!points) return null

    return (
      <polyline
        key={`brush-${index}`}
        points={points}
        fill="none"
        stroke={mark.color ?? DEFAULT_COLOR}
        strokeWidth={Math.max(1, Math.round((mark.width ?? 0.01) * VIEW_BOX_SIZE))}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
    )
  }

  if (mark.type === 'line' || mark.type === 'arrow') {
    const start = toViewBoxPoint(mark.start)
    const end = toViewBoxPoint(mark.end)
    const color = mark.color ?? DEFAULT_COLOR

    return (
      <g key={`${mark.type}-${index}`} opacity={opacity}>
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={color}
          strokeWidth={Math.max(1, Math.round((mark.width ?? 0.006) * VIEW_BOX_SIZE))}
          strokeLinecap="round"
        />
        {mark.type === 'arrow' && <polygon points={buildArrowHead(mark.start, mark.end)} fill={color} />}
      </g>
    )
  }

  if (mark.type === 'rectangle' || mark.type === 'ellipse') {
    const box = getBox(mark.start, mark.end)
    const strokeColor = mark.strokeColor ?? DEFAULT_COLOR
    const fillColor = mark.fillColor ?? 'rgba(220, 38, 38, 0.12)'

    if (box.width === 0 || box.height === 0) return null

    if (mark.type === 'rectangle') {
      return (
        <rect
          key={`rectangle-${index}`}
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={Math.max(1, Math.round((mark.lineWidth ?? 0.005) * VIEW_BOX_SIZE))}
          opacity={opacity}
        />
      )
    }

    return (
      <ellipse
        key={`ellipse-${index}`}
        cx={box.x + box.width / 2}
        cy={box.y + box.height / 2}
        rx={box.width / 2}
        ry={box.height / 2}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={Math.max(1, Math.round((mark.lineWidth ?? 0.005) * VIEW_BOX_SIZE))}
        opacity={opacity}
      />
    )
  }

  if (mark.type === 'text') {
    const position = toViewBoxPoint(mark.position)

    return (
      <text
        key={`text-${index}`}
        x={position.x}
        y={position.y}
        fontSize={Math.max(12, Math.round((mark.fontSize ?? 0.024) * VIEW_BOX_SIZE))}
        fontWeight="bold"
        fill={mark.color ?? DEFAULT_COLOR}
        stroke="white"
        strokeWidth={3}
        paintOrder="stroke"
        opacity={opacity}
      >
        {mark.text.slice(0, 80)}
      </text>
    )
  }

  if (mark.type === 'polygon-area') {
    const points = mark.points
      .map(toViewBoxPoint)
      .map((point) => `${point.x},${point.y}`)
      .join(' ')

    if (!points) return null

    return (
      <polygon
        key={`polygon-area-${index}`}
        points={points}
        fill={mark.fillColor ?? 'rgba(220, 38, 38, 0.2)'}
        stroke={mark.strokeColor ?? DEFAULT_COLOR}
        strokeWidth={Math.max(1, Math.round((mark.lineWidth ?? 0.005) * VIEW_BOX_SIZE))}
        opacity={opacity}
      />
    )
  }

  return null
}

function buildDraftMark(
  tool: DrawingMarkingTool,
  start: DrawingMarkupPoint,
  end: DrawingMarkupPoint
): DrawingMarkupMark | null {
  if (tool === 'line') {
    return { type: 'line', start, end: ensureVisibleEnd(start, end), color: DEFAULT_COLOR, width: 0.006 }
  }
  if (tool === 'arrow') {
    return { type: 'arrow', start, end: ensureVisibleEnd(start, end), color: DEFAULT_COLOR, width: 0.006 }
  }
  if (tool === 'rectangle') {
    return {
      type: 'rectangle',
      start,
      end: ensureVisibleEnd(start, end),
      strokeColor: DEFAULT_COLOR,
      fillColor: 'rgba(220, 38, 38, 0.12)',
    }
  }
  if (tool === 'ellipse') {
    return {
      type: 'ellipse',
      start,
      end: ensureVisibleEnd(start, end),
      strokeColor: DEFAULT_COLOR,
      fillColor: 'rgba(220, 38, 38, 0.12)',
    }
  }
  if (tool === 'polygon-area') {
    return {
      type: 'polygon-area',
      points: buildBoxPoints(start, end),
      strokeColor: DEFAULT_COLOR,
      fillColor: 'rgba(220, 38, 38, 0.2)',
    }
  }
  return null
}

export function DrawingMarkingOverlay({
  imageUrl,
  imageAlt = 'Drawing',
  previewKind = 'image',
  marks,
  activeTool,
  onActiveToolChange,
  onMarksChange,
  readOnly = false,
  disabled = false,
  className = '',
}: DrawingMarkingOverlayProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const [draftStart, setDraftStart] = useState<DrawingMarkupPoint | null>(null)
  const [draftEnd, setDraftEnd] = useState<DrawingMarkupPoint | null>(null)
  const [draftBrushPoints, setDraftBrushPoints] = useState<DrawingMarkupPoint[]>([])
  const isLocked = readOnly || disabled || !onMarksChange
  const draftMark = useMemo(() => {
    if (activeTool === 'brush' && draftBrushPoints.length > 0) {
      return { type: 'brush' as const, points: draftBrushPoints, color: DEFAULT_COLOR, width: 0.01 }
    }
    if (!draftStart || !draftEnd) return null
    return buildDraftMark(activeTool, draftStart, draftEnd)
  }, [activeTool, draftBrushPoints, draftEnd, draftStart])

  const commitMark = (mark: DrawingMarkupMark) => {
    if (isLocked) return
    onMarksChange?.([...marks, mark])
  }

  const resetDraft = () => {
    setDraftStart(null)
    setDraftEnd(null)
    setDraftBrushPoints([])
  }

  const setPointerCaptureSafely = (element: HTMLDivElement, pointerId: number) => {
    try {
      element.setPointerCapture(pointerId)
    } catch {
      // Some embedded preview surfaces can drop pointer capture during fast touch gestures.
    }
  }

  const releasePointerCaptureSafely = (element: HTMLDivElement, pointerId: number) => {
    try {
      if (element.hasPointerCapture(pointerId)) {
        element.releasePointerCapture(pointerId)
      }
    } catch {
      // The draft has already been resolved, so losing capture here is harmless.
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isLocked || activeTool === 'select') return
    if (!surfaceRef.current) return

    event.preventDefault()
    const point = getPointerPoint(event, surfaceRef.current)

    if (activeTool === 'text') {
      commitMark({ type: 'text', position: point, text: '메모', color: DEFAULT_COLOR, fontSize: 0.024 })
      return
    }

    if (activeTool === 'brush') {
      setDraftStart(point)
      setDraftEnd(point)
      setDraftBrushPoints([point])
      setPointerCaptureSafely(event.currentTarget, event.pointerId)
      return
    }

    if (buildDraftMark(activeTool, point, point)) {
      setDraftStart(point)
      setDraftEnd(point)
      setPointerCaptureSafely(event.currentTarget, event.pointerId)
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draftStart || isLocked || !surfaceRef.current) return

    event.preventDefault()
    const point = getPointerPoint(event, surfaceRef.current)
    setDraftEnd(point)

    if (activeTool === 'brush') {
      setDraftBrushPoints(current => {
        const previous = current[current.length - 1]
        if (previous && getDistance(previous, point) < MIN_BRUSH_STEP) return current
        return [...current, point]
      })
    }
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!draftStart || !draftEnd || isLocked) return

    event.preventDefault()
    const nextMark =
      activeTool === 'brush'
        ? {
            type: 'brush' as const,
            points: draftBrushPoints.length > 1 ? draftBrushPoints : [draftStart, ensureVisibleEnd(draftStart, draftEnd)],
            color: DEFAULT_COLOR,
            width: 0.01,
          }
        : buildDraftMark(activeTool, draftStart, draftEnd)

    if (nextMark) {
      commitMark(nextMark)
    }

    resetDraft()
    releasePointerCaptureSafely(event.currentTarget, event.pointerId)
  }

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    resetDraft()
    releasePointerCaptureSafely(event.currentTarget, event.pointerId)
  }

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--color-border)] bg-white p-1">
        {TOOL_ITEMS.map(({ tool, label, icon: Icon }) => {
          const isActive = activeTool === tool
          return (
            <button
              key={tool}
              type="button"
              aria-label={label}
              title={label}
              disabled={disabled || readOnly}
              onClick={() => onActiveToolChange?.(tool)}
              className={`flex h-9 items-center gap-2 rounded-md px-3 text-[var(--color-text-secondary)] transition ${
                isActive ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-bg-soft)]'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          )
        })}
      </div>

      <div className="relative min-h-[320px] touch-none overflow-hidden rounded-md border border-[var(--color-border)] bg-slate-100">
        {imageUrl && previewKind === 'pdf' ? (
          <object
            data={imageUrl}
            type="application/pdf"
            aria-label={imageAlt}
            className="pointer-events-none h-full min-h-[320px] w-full bg-white"
          >
            <div className="flex min-h-[320px] items-center justify-center px-4 text-center text-sm text-[var(--color-text-tertiary)]">
              PDF preview is unavailable in this browser.
            </div>
          </object>
        ) : imageUrl ? (
          <img src={imageUrl} alt={imageAlt} className="pointer-events-none h-full min-h-[320px] w-full select-none object-contain" />
        ) : (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-[var(--color-text-tertiary)]">
            No drawing image
          </div>
        )}

        {!isLocked && activeTool !== 'select' && (
          <div className="pointer-events-none absolute inset-0 z-10 rounded-md ring-2 ring-sky-300/70" />
        )}

        <svg
          viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          preserveAspectRatio="none"
        >
          {marks.map((mark, index) => renderMark(mark, index))}
          {draftMark && renderMark(draftMark, marks.length, true)}
        </svg>

        <div
          ref={surfaceRef}
          aria-label={activeTool === 'select' ? '도면마킹 선택 영역' : '도면마킹 입력 영역'}
          className={`absolute inset-0 z-30 touch-none ${
            isLocked || activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={resetDraft}
        />
      </div>
    </div>
  )
}
