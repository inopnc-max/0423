'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Site {
  id: string
  name: string
  company: string
  address: string
  manager: string
}

interface DailyLog {
  id: string
  work_date: string
  worker_array: { name: string; count: number }[]
  task_tags: string[]
}

export default function ConfirmSheetPage() {
  const { user } = useAuth()
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [log, setLog] = useState<DailyLog | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    async function fetchSites() {
      try {
        const { data } = await supabase.from('sites').select('id, name, company, address, manager').order('name').limit(50)
        if (data) setSites(data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchSites()
  }, [user, supabase])

  useEffect(() => {
    if (!selectedSite || !selectedDate) return
    async function fetchLog() {
      try {
        const { data } = await supabase
          .from('daily_logs')
          .select('id, work_date, worker_array, task_tags')
          .eq('site_id', selectedSite)
          .eq('work_date', selectedDate)
          .single()
        if (data) setLog(data)
        else setLog(null)
      } catch {}
    }
    fetchLog()
  }, [selectedSite, selectedDate, supabase])

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

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawing.current = true
    const pos = getCanvasPos(e)
    lastPos.current = pos
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.strokeStyle = '#1B233D'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  const endDraw = () => {
    if (drawing.current) {
      drawing.current = false
      const canvas = canvasRef.current
      if (canvas) {
        setSignature(canvas.toDataURL())
      }
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setSignature(null)
    }
  }

  const generatePDF = useCallback(async () => {
    const site = sites.find(s => s.id === selectedSite)
    if (!site || !log || !signature) return

    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      doc.setFont('Pretendard')
      doc.setFontSize(20)
      doc.text('현장 확인서', 105, 20, { align: 'center' })

      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`발급일: ${format(new Date(), 'yyyy년 M월 d일', { locale: ko })}`, 105, 28, { align: 'center' })

      doc.setDrawColor(200)
      doc.line(20, 35, 190, 35)

      doc.setFontSize(12)
      doc.setTextColor(0)
      doc.text(`현장명: ${site.name}`, 20, 45)
      doc.text(`회사: ${site.company}`, 20, 53)
      doc.text(`주소: ${site.address}`, 20, 61)
      doc.text(`현장소장: ${site.manager}`, 20, 69)
      doc.text(`작업일: ${format(new Date(log.work_date), 'yyyy년 M월 d일 (EEEE)', { locale: ko })}`, 20, 77)

      doc.line(20, 82, 190, 82)

      doc.text('작업 인원', 20, 90)
      const workers = log.worker_array || []
      let y = 97
      workers.forEach(w => {
        doc.text(`- ${w.name}: ${w.count}명`, 25, y)
        y += 7
      })

      doc.text('작업 항목', 20, y + 5)
      y += 12
      const tags = log.task_tags || []
      doc.text(tags.join(', '), 25, y)

      doc.line(20, y + 10, 190, y + 10)

      doc.text('서명', 20, y + 18)
      if (signature) {
        doc.addImage(signature, 'PNG', 20, y + 22, 60, 30)
      }
      doc.text(`${user?.profile?.name || '작업자'} (인)`, 90, y + 50)

      doc.save(`확인서_${site.name}_${log.work_date}.pdf`)
    } catch (err) {
      console.error('PDF 생성 실패:', err)
      alert('PDF 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }, [sites, selectedSite, log, signature, user])

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold text-[var(--color-navy)] mb-4">확인서</h1>

      {/* Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">현장</label>
          <select
            value={selectedSite}
            onChange={e => setSelectedSite(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
          >
            <option value="">현장 선택</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">작업일</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
          />
        </div>
      </div>

      {/* Preview */}
      {selectedSite && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="font-semibold text-[var(--color-navy)] mb-3">확인서 미리보기</h2>

          {log ? (
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">현장</span>
                <span className="font-medium">{sites.find(s => s.id === selectedSite)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">작업일</span>
                <span className="font-medium">{format(new Date(log.work_date), 'yyyy년 M월 d일', { locale: ko })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">인원</span>
                <span className="font-medium">
                  {(log.worker_array || []).reduce((s, w) => s + w.count, 0)}명
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">작업항목</span>
                <span className="font-medium text-right max-w-[60%]">{(log.task_tags || []).join(', ')}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
              해당 날짜의 작업 기록이 없습니다.
            </p>
          )}
        </div>
      )}

      {/* Signature */}
      {log && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[var(--color-navy)]">서명</h2>
            <button onClick={clearSignature} className="text-xs text-red-500 hover:underline">
              지우기
            </button>
          </div>
          <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-2 text-center">
            위 영역에 서명을 해주세요
          </p>
        </div>
      )}

      {/* Generate Button */}
      {log && (
        <button
          onClick={generatePDF}
          disabled={generating || !signature}
          className="w-full py-4 bg-[var(--color-navy)] text-white rounded-xl font-medium hover:bg-[var(--color-navy-hover)] transition disabled:opacity-50"
        >
          {generating ? 'PDF 생성 중...' : 'PDF 다운로드'}
        </button>
      )}
    </div>
  )
}
