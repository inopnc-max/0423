'use client'

import type { PointerEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Circle,
  Edit3,
  Highlighter,
  MousePointer2,
  PenLine,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react'
import type { DrawingMarkupMark, DrawingMarkupPoint } from '@/lib/types/drawing-markup'
import { PdfCanvasPreview } from './PdfCanvasPreview'

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
  pageNo?: number
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
const DEFAULT_LINE_WIDTH = 0.006
const DEFAULT_BRUSH_WIDTH = 0.01
const DEFAULT_SHAPE_LINE_WIDTH = 0.005
const DEFAULT_TEXT_SIZE = 0.024
const DEFAULT_TEXT_VALUE = '메모'
const MIN_VISIBLE_DELTA = 0.018
const MIN_BRUSH_STEP = 0.004

const MARK_COLORS = [
  { value: '#dc2626', label: 'Red' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#16a34a', label: 'Green' },
  { value: '#111827', label: 'Black' },
] as const

const STROKE_WIDTHS = [
  { value: 0.004, label: 'Thin', previewHeight: 2 },
  { value: DEFAULT_LINE_WIDTH, label: 'Medium', previewHeight: 3 },
  { value: 0.01, label: 'Thick', previewHeight: 5 },
] as const

type DraftSession = {
  pointerId: number
  start: DrawingMarkupPoint
  end: DrawingMarkupPoint
  brushPoints: DrawingMarkupPoint[]
}

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

function getToolWidth(tool: DrawingMarkingTool, width: number): number {
  if (tool === 'brush') {
    return width === DEFAULT_LINE_WIDTH ? DEFAULT_BRUSH_WIDTH : width
  }

  if (tool === 'rectangle' || tool === 'ellipse' || tool === 'polygon-area') {
    return width === DEFAULT_LINE_WIDTH ? DEFAULT_SHAPE_LINE_WIDTH : width
  }

  return width
}

function getTransparentFill(color: string, opacity: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return color

  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
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
  end: DrawingMarkupPoint,
  color = DEFAULT_COLOR,
  selectedWidth = DEFAULT_LINE_WIDTH
): DrawingMarkupMark | null {
  const width = getToolWidth(tool, selectedWidth)

  if (tool === 'line') {
    return { type: 'line', start, end: ensureVisibleEnd(start, end), color, width }
  }
  if (tool === 'arrow') {
    return { type: 'arrow', start, end: ensureVisibleEnd(start, end), color, width }
  }
  if (tool === 'rectangle') {
    return {
      type: 'rectangle',
      start,
      end: ensureVisibleEnd(start, end),
      lineWidth: width,
      strokeColor: color,
      fillColor: getTransparentFill(color, 0.12),
    }
  }
  if (tool === 'ellipse') {
    return {
      type: 'ellipse',
      start,
      end: ensureVisibleEnd(start, end),
      lineWidth: width,
      strokeColor: color,
      fillColor: getTransparentFill(color, 0.12),
    }
  }
  if (tool === 'polygon-area') {
    return {
      type: 'polygon-area',
      points: buildBoxPoints(start, end),
      lineWidth: width,
      strokeColor: color,
      fillColor: getTransparentFill(color, 0.2),
    }
  }
  return null
}

export function DrawingMarkingOverlay({
  imageUrl,
  imageAlt = 'Drawing',
  previewKind = 'image',
  pageNo = 1,
  marks,
  activeTool,
  onActiveToolChange,
  onMarksChange,
  readOnly = false,
  disabled = false,
  className = '',
}: DrawingMarkingOverlayProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const draftSessionRef = useRef<DraftSession | null>(null)
  const historyRef = useRef<DrawingMarkupMark[][]>([marks])
  const historyIndexRef = useRef(0)
  const [draftStart, setDraftStart] = useState<DrawingMarkupPoint | null>(null)
  const [draftEnd, setDraftEnd] = useState<DrawingMarkupPoint | null>(null)
  const [draftBrushPoints, setDraftBrushPoints] = useState<DrawingMarkupPoint[]>([])
  const [markColor, setMarkColor] = useState(DEFAULT_COLOR)
  const [markWidth, setMarkWidth] = useState(DEFAULT_LINE_WIDTH)
  const [historyIndex, setHistoryIndex] = useState(0)
  const isLocked = readOnly || disabled || !onMarksChange
  const marksSignature = useMemo(() => JSON.stringify(marks), [marks])
  const draftMark = useMemo(() => {
    if (activeTool === 'brush' && draftBrushPoints.length > 0) {
      return { type: 'brush' as const, points: draftBrushPoints, color: markColor, width: getToolWidth('brush', markWidth) }
    }
    if (!draftStart || !draftEnd) return null
    return buildDraftMark(activeTool, draftStart, draftEnd, markColor, markWidth)
  }, [activeTool, draftBrushPoints, draftEnd, draftStart, markColor, markWidth])

  useEffect(() => {
    const currentHistoryMarks = historyRef.current[historyIndexRef.current] ?? []
    if (JSON.stringify(currentHistoryMarks) === marksSignature) return

    historyRef.current = [marks]
    historyIndexRef.current = 0
    setHistoryIndex(0)
  }, [marks, marksSignature])

  const setHistoryCursor = (nextIndex: number) => {
    historyIndexRef.current = nextIndex
    setHistoryIndex(nextIndex)
  }

  const applyMarks = (nextMarks: DrawingMarkupMark[]) => {
    if (isLocked) return

    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
    nextHistory.push(nextMarks)
    historyRef.current = nextHistory
    setHistoryCursor(nextHistory.length - 1)
    onMarksChange?.(nextMarks)
  }

  const commitMark = (mark: DrawingMarkupMark) => {
    applyMarks([...marks, mark])
  }

  const requestTextValue = () => {
    if (typeof window === 'undefined') return DEFAULT_TEXT_VALUE

    const input = window.prompt('마킹 텍스트를 입력하세요.', DEFAULT_TEXT_VALUE)
    if (input === null) return null

    const nextValue = input.trim()
    return nextValue || DEFAULT_TEXT_VALUE
  }

  const resetDraft = () => {
    draftSessionRef.current = null
    setDraftStart(null)
    setDraftEnd(null)
    setDraftBrushPoints([])
  }

  const startDraftSession = (pointerId: number, point: DrawingMarkupPoint) => {
    draftSessionRef.current = {
      pointerId,
      start: point,
      end: point,
      brushPoints: activeTool === 'brush' ? [point] : [],
    }
    setDraftStart(point)
    setDraftEnd(point)
    setDraftBrushPoints(activeTool === 'brush' ? [point] : [])
  }

  const updateDraftSession = (pointerId: number, point: DrawingMarkupPoint) => {
    const session = draftSessionRef.current
    if (!session || session.pointerId !== pointerId) return null

    session.end = point
    setDraftEnd(point)

    if (activeTool === 'brush') {
      const previous = session.brushPoints[session.brushPoints.length - 1]
      if (!previous || getDistance(previous, point) >= MIN_BRUSH_STEP) {
        session.brushPoints = [...session.brushPoints, point]
        setDraftBrushPoints(session.brushPoints)
      }
    }

    return session
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
      const text = requestTextValue()
      if (text === null) return

      commitMark({ type: 'text', position: point, text, color: markColor, fontSize: DEFAULT_TEXT_SIZE })
      return
    }

    if (activeTool === 'brush') {
      startDraftSession(event.pointerId, point)
      setPointerCaptureSafely(event.currentTarget, event.pointerId)
      return
    }

    if (buildDraftMark(activeTool, point, point)) {
      startDraftSession(event.pointerId, point)
      setPointerCaptureSafely(event.currentTarget, event.pointerId)
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draftSessionRef.current || isLocked || !surfaceRef.current) return

    event.preventDefault()
    const point = getPointerPoint(event, surfaceRef.current)
    updateDraftSession(event.pointerId, point)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const session = draftSessionRef.current
    if (!session || session.pointerId !== event.pointerId || isLocked || !surfaceRef.current) return

    event.preventDefault()
    const point = getPointerPoint(event, surfaceRef.current)
    const finalSession = updateDraftSession(event.pointerId, point) ?? session
    const nextMark =
      activeTool === 'brush'
        ? {
            type: 'brush' as const,
            points: finalSession.brushPoints.length > 1
              ? finalSession.brushPoints
              : [finalSession.start, ensureVisibleEnd(finalSession.start, finalSession.end)],
            color: markColor,
            width: getToolWidth('brush', markWidth),
          }
        : buildDraftMark(activeTool, finalSession.start, finalSession.end, markColor, markWidth)

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

  const handleUndo = () => {
    if (isLocked || historyIndex <= 0) return

    resetDraft()
    const nextIndex = historyIndex - 1
    setHistoryCursor(nextIndex)
    onMarksChange?.(historyRef.current[nextIndex] ?? [])
  }

  const handleRedo = () => {
    if (isLocked || historyIndex >= historyRef.current.length - 1) return

    resetDraft()
    const nextIndex = historyIndex + 1
    setHistoryCursor(nextIndex)
    onMarksChange?.(historyRef.current[nextIndex] ?? [])
  }

  const handleClear = () => {
    if (isLocked || marks.length === 0) return

    resetDraft()
    applyMarks([])
  }

  const canUndo = !isLocked && historyIndex > 0
  const canRedo = !isLocked && historyIndex < historyRef.current.length - 1
  const canClear = !isLocked && marks.length > 0

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
        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" aria-hidden="true" />
        <button
          type="button"
          aria-label="Undo"
          title="Undo"
          disabled={!canUndo}
          onClick={handleUndo}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Redo"
          title="Redo"
          disabled={!canRedo}
          onClick={handleRedo}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Clear all"
          title="Clear all"
          disabled={!canClear}
          onClick={handleClear}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" aria-hidden="true" />
        <div className="flex items-center gap-1">
          {MARK_COLORS.map((color) => {
            const isActive = markColor === color.value

            return (
              <button
                key={color.value}
                type="button"
                aria-label={`Color ${color.label}`}
                title={color.label}
                disabled={disabled || readOnly}
                onClick={() => setMarkColor(color.value)}
                className={`grid h-9 w-9 place-items-center rounded-md transition hover:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive ? 'ring-2 ring-[var(--color-primary)] ring-offset-1' : ''
                }`}
              >
                <span
                  className="h-5 w-5 rounded-full border border-black/10"
                  style={{ backgroundColor: color.value }}
                />
              </button>
            )
          })}
        </div>
        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" aria-hidden="true" />
        <div className="flex items-center gap-1">
          {STROKE_WIDTHS.map((width) => {
            const isActive = markWidth === width.value

            return (
              <button
                key={width.value}
                type="button"
                aria-label={`Stroke ${width.label}`}
                title={width.label}
                disabled={disabled || readOnly}
                onClick={() => setMarkWidth(width.value)}
                className={`grid h-9 w-9 place-items-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive ? 'bg-[var(--color-primary)] text-white' : ''
                }`}
              >
                <span
                  className="w-5 rounded-full bg-current"
                  style={{ height: width.previewHeight }}
                />
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative min-h-[320px] touch-none overflow-hidden rounded-md border border-[var(--color-border)] bg-slate-100">
        {imageUrl && previewKind === 'pdf' ? (
          <PdfCanvasPreview url={imageUrl} pageNo={pageNo} title={imageAlt} />
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
        />
      </div>
    </div>
  )
}
