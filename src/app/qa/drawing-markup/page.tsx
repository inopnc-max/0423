'use client'

import { useMemo, useState } from 'react'
import { DrawingMarkingOverlay, type DrawingMarkingTool } from '@/components/drawing-markup'
import type { DrawingMarkupMark } from '@/lib/types/drawing-markup'

const sampleImage =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 820">
      <rect width="1200" height="820" fill="#f8fafc"/>
      <rect x="80" y="70" width="1040" height="680" fill="#ffffff" stroke="#334155" stroke-width="4"/>
      <rect x="150" y="140" width="390" height="230" fill="#e0f2fe" stroke="#2563eb" stroke-width="3"/>
      <rect x="650" y="140" width="300" height="230" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
      <rect x="150" y="470" width="800" height="180" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
      <line x1="80" y1="420" x2="1120" y2="420" stroke="#94a3b8" stroke-width="2" stroke-dasharray="12 12"/>
      <line x1="600" y1="70" x2="600" y2="750" stroke="#94a3b8" stroke-width="2" stroke-dasharray="12 12"/>
      <text x="120" y="112" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0f172a">Drawing Markup QA Sheet</text>
      <text x="170" y="190" font-family="Arial, sans-serif" font-size="24" fill="#1e3a8a">Zone A</text>
      <text x="680" y="190" font-family="Arial, sans-serif" font-size="24" fill="#92400e">Zone B</text>
      <text x="180" y="525" font-family="Arial, sans-serif" font-size="24" fill="#166534">Long Area</text>
      <text x="900" y="720" font-family="Arial, sans-serif" font-size="18" fill="#64748b">No upload, Storage, or Supabase required</text>
    </svg>
  `)

const initialMarks: DrawingMarkupMark[] = [
  {
    type: 'rectangle',
    start: { x: 0.12, y: 0.12 },
    end: { x: 0.45, y: 0.38 },
    strokeColor: '#2563eb',
    fillColor: 'rgba(37, 99, 235, 0.12)',
    lineWidth: 0.005,
  },
  {
    type: 'text',
    position: { x: 0.15, y: 0.18 },
    text: 'QA 메모',
    color: '#dc2626',
    fontSize: 0.024,
  },
  {
    type: 'polygon-area',
    points: [
      { x: 0.57, y: 0.58 },
      { x: 0.8, y: 0.56 },
      { x: 0.83, y: 0.75 },
      { x: 0.6, y: 0.78 },
    ],
    strokeColor: '#16a34a',
    fillColor: 'rgba(22, 163, 74, 0.2)',
    lineWidth: 0.005,
  },
]

export default function DrawingMarkupQaLabPage() {
  const [activeTool, setActiveTool] = useState<DrawingMarkingTool>('line')
  const [marks, setMarks] = useState<DrawingMarkupMark[]>(() => [...initialMarks])
  const markSummary = useMemo(() => {
    return marks.reduce<Record<string, number>>((summary, mark) => {
      summary[mark.type] = (summary[mark.type] ?? 0) + 1
      return summary
    }, {})
  }, [marks])

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[var(--color-primary)]">Drawing Markup QA Lab</p>
          <h1 className="text-2xl font-bold text-[var(--color-text-title)]">도면마킹 독립 테스트</h1>
          <p className="max-w-3xl text-sm text-[var(--color-text-secondary)]">
            작업일지 첨부, Storage 업로드, Supabase 저장 흐름과 분리된 화면입니다. 여기서 도구 선택,
            색상, 선굵기, 텍스트 입력, undo, redo, clear all 동작을 바로 확인할 수 있습니다.
          </p>
        </header>

        <section className="grid gap-3 rounded-md border border-[var(--color-border)] bg-white p-3 md:grid-cols-4">
          <div>
            <div className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)]">Active tool</div>
            <div className="mt-1 text-lg font-bold text-[var(--color-text-title)]">{activeTool}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)]">Marks</div>
            <div className="mt-1 text-lg font-bold text-[var(--color-text-title)]">{marks.length}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)]">Summary</div>
            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {Object.entries(markSummary).length > 0
                ? Object.entries(markSummary).map(([type, count]) => `${type} ${count}`).join(' · ')
                : 'No marks'}
            </div>
          </div>
        </section>

        <DrawingMarkingOverlay
          imageUrl={sampleImage}
          imageAlt="Drawing markup QA sample"
          previewKind="image"
          pageNo={1}
          marks={marks}
          activeTool={activeTool}
          onActiveToolChange={setActiveTool}
          onMarksChange={setMarks}
        />
      </div>
    </main>
  )
}
