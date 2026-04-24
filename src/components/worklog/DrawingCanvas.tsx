'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, PenLine, RotateCcw, Undo2, Redo2, Download, Upload } from 'lucide-react'

export type DrawingTool = 'pen' | 'eraser'

export type DrawingColor = {
  label: string
  value: string
}

export const DRAWING_COLORS: DrawingColor[] = [
  { label: '빨강', value: '#ef4444' },
  { label: '주황', value: '#f97316' },
  { label: '노랑', value: '#eab308' },
  { label: '초록', value: '#22c55e' },
  { label: '파랑', value: '#3b82f6' },
  { label: '검정', value: '#111827' },
]

export const LINE_WIDTHS = [2, 4, 8, 12] as const
export type LineWidth = (typeof LINE_WIDTHS)[number]

export interface DrawingRef {
  getImageBlob: () => Promise<Blob | null>
  getDataUrl: () => string
  reset: () => void
  undo: () => void
  redo: () => void
}

interface Point {
  x: number
  y: number
}

interface DrawAction {
  type: 'stroke'
  points: Point[]
  color: string
  lineWidth: number
  tool: DrawingTool
}

interface DrawingCanvasProps {
  /** 표시할 배경 이미지 URL */
  imageUrl?: string
  /** 초기 canvas 너비 (px) */
  width?: number
  /** 초기 canvas 높이 (px) */
  height?: number
  /** 저장 버튼 클릭 시 콜백 */
  onSave?: (blob: Blob, dataUrl: string) => void | Promise<void>
  /** 취소 버튼 클릭 시 콜백 */
  onCancel?: () => void
  /** 저장 버튼 비활성화 여부 */
  saveDisabled?: boolean
  /** 외부 ref — 부모에서 canvas 데이터 접근 가능 */
  drawingRef?: React.MutableRefObject<DrawingRef | null>
}

export default function DrawingCanvas({
  imageUrl,
  width = 800,
  height = 600,
  onSave,
  onCancel,
  saveDisabled = false,
  drawingRef,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const currentPointsRef = useRef<Point[]>([])

  const [tool, setTool] = useState<DrawingTool>('pen')
  const [color, setColor] = useState(DRAWING_COLORS[5].value) // 검정 기본
  const [lineWidth, setLineWidth] = useState<LineWidth>(LINE_WIDTHS[1]) // 4px 기본
  const [history, setHistory] = useState<DrawAction[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isSaving, setIsSaving] = useState(false)

  // ─── Canvas 렌더링 ─────────────────────────────────────────────────────
  const redraw = useCallback((actions: DrawAction[], upToIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const visible = actions.slice(0, upToIndex + 1)
    for (const action of visible) {
      if (action.points.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = action.tool === 'eraser' ? '#ffffff' : action.color
      ctx.lineWidth = action.tool === 'eraser' ? action.lineWidth * 3 : action.lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.moveTo(action.points[0].x, action.points[0].y)
      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i].x, action.points[i].y)
      }
      ctx.stroke()
    }
  }, [])

  // ─── 배경 이미지 로드 ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageUrl) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = width
      canvas.height = height
      ctx.clearRect(0, 0, width, height)
      const scale = Math.min(width / img.width, height / img.height)
      const drawW = img.width * scale
      const drawH = img.height * scale
      const offsetX = (width - drawW) / 2
      const offsetY = (height - drawH) / 2
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH)
      redraw(history, historyIndex)
    }
    img.onerror = () => {
      canvas.width = width
      canvas.height = height
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      redraw(history, historyIndex)
    }
    img.src = imageUrl
  }, [imageUrl, width, height, history, historyIndex, redraw])

  // ─── 배경 없을 때 초기화 ──────────────────────────────────────────────
  useEffect(() => {
    if (!imageUrl) {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      redraw(history, historyIndex)
    }
  }, [imageUrl, width, height, history, historyIndex, redraw])

  // ─── 그리기 ──────────────────────────────────────────────────────────
  const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const onPointerDown = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true
    currentPointsRef.current = [getPos(e)]
  }, [getPos])

  const onPointerMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pos = getPos(e)
    currentPointsRef.current.push(pos)

    const newPoints = currentPointsRef.current
    ctx.beginPath()
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (newPoints.length >= 2) {
      ctx.moveTo(newPoints[newPoints.length - 2].x, newPoints[newPoints.length - 2].y)
      ctx.lineTo(newPoints[newPoints.length - 1].x, newPoints[newPoints.length - 1].y)
      ctx.stroke()
    }
  }, [getPos, tool, color, lineWidth])

  const onPointerUp = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    if (currentPointsRef.current.length < 2) return

    const action: DrawAction = {
      type: 'stroke',
      points: [...currentPointsRef.current],
      color,
      lineWidth,
      tool,
    }

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(action)
      setHistoryIndex(newHistory.length - 1)
      return newHistory
    })

    currentPointsRef.current = []
  }, [color, lineWidth, tool, historyIndex])

  // ─── Undo / Redo ────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setHistoryIndex(prev => {
      const next = Math.max(-1, prev - 1)
      redraw(history, next)
      return next
    })
  }, [history, redraw])

  const redo = useCallback(() => {
    setHistoryIndex(prev => {
      const next = Math.min(history.length - 1, prev + 1)
      redraw(history, next)
      return next
    })
  }, [history, redraw])

  // ─── 리셋 ────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setHistory([])
    setHistoryIndex(-1)
    currentPointsRef.current = []
    isDrawingRef.current = false

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  // ─── 데이터 추출 ────────────────────────────────────────────────────
  const getImageBlob = useCallback(async (): Promise<Blob | null> => {
    return new Promise(resolve => {
      const canvas = canvasRef.current
      if (!canvas) { resolve(null); return }
      canvas.toBlob(blob => resolve(blob), 'image/png', 1)
    })
  }, [])

  const getDataUrl = useCallback((): string => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    return canvas.toDataURL('image/png')
  }, [])

  // ─── 외부 ref 바인딩 ─────────────────────────────────────────────────
  useEffect(() => {
    if (drawingRef) {
      drawingRef.current = { getImageBlob, getDataUrl, reset, undo, redo }
    }
  }, [drawingRef, getImageBlob, getDataUrl, reset, undo, redo])

  // ─── 저장 ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const blob = await getImageBlob()
      const dataUrl = getDataUrl()
      if (blob && onSave) {
        await onSave(blob, dataUrl)
      }
    } finally {
      setIsSaving(false)
    }
  }, [getImageBlob, getDataUrl, onSave])

  // ─── 키보드 단축키 ─────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <div className="flex flex-col h-full">
      {/* ── 툴바 ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-3 border-b border-[var(--color-border)] bg-white flex-wrap">
        {/* 펜 / 지우개 */}
        <div className="flex items-center gap-1 bg-[var(--color-bg)] rounded-xl p-1">
          <button
            onClick={() => setTool('pen')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tool === 'pen'
                ? 'bg-[var(--color-navy)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
            }`}
          >
            <PenLine className="w-4 h-4" />
            <span className="hidden sm:inline">펜</span>
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tool === 'eraser'
                ? 'bg-[var(--color-navy)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
            }`}
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden sm:inline">지우개</span>
          </button>
        </div>

        {/* 선 굵기 */}
        <div className="flex items-center gap-1.5">
          {LINE_WIDTHS.map(w => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                lineWidth === w
                  ? 'bg-[var(--color-primary-soft)]'
                  : 'hover:bg-[var(--color-bg)]'
              }`}
              title={`${w}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{
                  width: Math.min(w * 1.5, 20),
                  height: Math.min(w * 1.5, 20),
                }}
              />
            </button>
          ))}
        </div>

        {/* 색상 */}
        <div className="flex items-center gap-1">
          {DRAWING_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => { setColor(c.value); setTool('pen') }}
              className={`w-7 h-7 rounded-full transition-all ${color === c.value ? 'ring-2 ring-offset-1 ring-[var(--color-navy)] scale-110' : 'hover:scale-110'}`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>

        <div className="flex-1" />

        {/* Undo / Redo / Reset */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyIndex < 0}
            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] disabled:opacity-30 transition"
            title="실행 취소 (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] disabled:opacity-30 transition"
            title="다시 실행 (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={reset}
            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition"
            title="초기화"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 캔버스 영역 ─────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#f0f0f0] flex items-center justify-center p-4"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={e => { e.preventDefault(); onPointerDown(e) }}
          onTouchMove={e => { e.preventDefault(); onPointerMove(e) }}
          onTouchEnd={e => { e.preventDefault(); onPointerUp() }}
          className="cursor-crosshair shadow-lg max-w-full"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* ── 하단 버튼 ──────────────────────────────────────── */}
      {(onSave || onCancel) && (
        <div className="flex gap-3 p-4 border-t border-[var(--color-border)] bg-white">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 h-12 rounded-xl border border-[var(--color-border)] text-[14px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition"
            >
              취소
            </button>
          )}
          {onSave && (
            <button
              onClick={handleSave}
              disabled={saveDisabled || isSaving}
              className="flex-1 h-12 rounded-xl bg-[var(--color-navy)] text-white text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-navy-hover)] transition active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? (
                <span className="animate-pulse">저장 중...</span>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  저장
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
