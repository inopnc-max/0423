'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock3, FileSearch, Layers3, MapPinned, X } from 'lucide-react'
import { useDrawingMarkupReviewQueue } from '@/hooks'
import type { DrawingMarkupReviewQueueItem } from '@/lib/drawing-markup-records'
import { DrawingMarkupMultiPagePreview } from '@/components/preview/reports/DrawingMarkupMultiPagePreview'
import type { DrawingMarkupPreviewDocument } from '@/components/preview/reports/drawing-markup-preview-types'

function formatDateTime(value: string | null): string {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function buildPreviewDocument(item: DrawingMarkupReviewQueueItem): DrawingMarkupPreviewDocument {
  const fallbackAttachmentTitle = item.attachmentName || `도면 ${item.pageNo}`
  const previewStatus = item.status === 'archived' ? undefined : item.status

  return {
    title: `${item.siteName ?? '현장'} 도면마킹 검토`,
    siteId: item.siteId,
    siteName: item.siteName ?? undefined,
    workDate: item.workDate ?? undefined,
    status: previewStatus,
    pages: [
      {
        id: item.id,
        title: fallbackAttachmentTitle,
        storageBucket: 'drawings',
        storagePath: item.markedPath ?? item.originalPath,
        sourceLabel: 'drawing_markups',
        workDate: item.workDate ?? undefined,
        marks: item.marks,
      },
    ],
  }
}

export function DrawingMarkupReviewQueuePanel() {
  const { loadPendingQueue, loading, error, isSiteManager } = useDrawingMarkupReviewQueue()
  const [items, setItems] = useState<DrawingMarkupReviewQueueItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    loadPendingQueue()
      .then(nextItems => {
        if (cancelled) return
        setItems(nextItems)
        setSelectedId(current => current && nextItems.some(item => item.id === current) ? current : nextItems[0]?.id ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setItems([])
      })

    return () => {
      cancelled = true
    }
  }, [loadPendingQueue])

  const selectedItem = useMemo(
    () => items.find(item => item.id === selectedId) ?? null,
    [items, selectedId]
  )

  const previewDocument = useMemo(
    () => (selectedItem ? buildPreviewDocument(selectedItem) : null),
    [selectedItem]
  )

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-navy)]">도면마킹 검토 Queue</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            pending 상태 도면마킹을 읽기 전용으로 확인하는 skeleton입니다.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          {isSiteManager ? 'site_manager scope' : 'admin scope'}
        </span>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        이 화면에서는 목록 조회와 미리보기만 제공합니다. 승인, 반려, 잠금, 문서 등록, export 동작은 포함하지 않습니다.
      </div>

      {loading ? (
        <div className="rounded-xl border border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
          도면마킹 review queue를 불러오는 중입니다.
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
          pending 도면마킹이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3">
            {items.map(item => {
              const isActive = item.id === selectedId
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-[var(--color-accent)] bg-sky-50'
                      : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-soft)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {item.attachmentName || `첨부 ${item.attachmentId.slice(0, 8)}`}
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      pending
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-1.5">
                      <MapPinned className="h-3.5 w-3.5" strokeWidth={1.9} />
                      <span className="truncate">{item.siteName || item.siteId}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileSearch className="h-3.5 w-3.5" strokeWidth={1.9} />
                      <span>작성자 {item.requesterName || item.createdBy.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers3 className="h-3.5 w-3.5" strokeWidth={1.9} />
                      <span>mark {item.marks.length}개 / page {item.pageNo}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" strokeWidth={1.9} />
                      <span>{formatDateTime(item.updatedAt)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            {selectedItem && previewDocument ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {selectedItem.attachmentName || selectedItem.attachmentId}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                      <span>현장: {selectedItem.siteName || selectedItem.siteId}</span>
                      <span>작업일: {selectedItem.workDate || '-'}</span>
                      <span>작성자: {selectedItem.requesterName || selectedItem.createdBy.slice(0, 8)}</span>
                      <span>상태: {selectedItem.status} / {selectedItem.approvalStatus}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)]"
                    aria-label="미리보기 닫기"
                    title="미리보기 닫기"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <DrawingMarkupMultiPagePreview document={previewDocument} />
              </div>
            ) : (
              <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-white px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
                왼쪽 목록에서 도면마킹 항목을 선택하면 읽기 전용 preview가 열립니다.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
