'use client'

import { useRef, useCallback, useState } from 'react'
import { Edit, RotateCcw, Check } from 'lucide-react'

interface ConfirmSheetSignaturePadProps {
  signatureDataUrl: string | null
  onSignatureChange: (dataUrl: string | null) => void
}

/**
 * 서명 패드 컴포넌트
 * - 캔버스 기반 서명 입력
 * - 지우기 / 완료 상태 표시
 * - 터치/마우스 지원
 */
export function ConfirmSheetSignaturePad({
  signatureDataUrl,
  onSignatureChange,
}: ConfirmSheetSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false)

  // 캔버스 좌표 계산
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  // 그리기 시작
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawing.current = true
    setIsDrawing(true)
    const pos = getCanvasPos(e)
    lastPos.current = pos
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  // 그리기
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.strokeStyle = '#1B233D'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  // 그리기 종료
  const endDraw = useCallback(() => {
    if (drawing.current) {
      drawing.current = false
      setIsDrawing(false)
      const canvas = canvasRef.current
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png')
        onSignatureChange(dataUrl)
      }
    }
  }, [onSignatureChange])

  // 지우기
  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      onSignatureChange(null)
    }
  }

  const hasSignature = !!signatureDataUrl && !isDrawing

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit className="h-4 w-4 text-[var(--color-navy)]" />
          <h3 className="font-semibold text-[var(--color-navy)]">서명</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasSignature && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <Check className="h-3.5 w-3.5" />
              서명 완료
            </span>
          )}
          <button
            type="button"
            onClick={clearSignature}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            지우기
          </button>
        </div>
      </div>

      {/* 캔버스 */}
      <div
        className={`border border-dashed rounded-lg overflow-hidden transition ${
          hasSignature
            ? 'border-emerald-300 bg-[var(--form-surface-selected)]'
            : 'border-[var(--form-dashed-border)] bg-[var(--form-surface-soft)]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      <p className="text-xs text-[var(--color-text-tertiary)] text-center">
        위 영역에 서명을 해주세요
      </p>
    </div>
  )
}
