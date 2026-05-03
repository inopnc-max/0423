'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  FileSearch,
  LockKeyhole,
  Layers3,
  MapPinned,
  X,
  XCircle,
} from 'lucide-react'
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
  const previewStatus = item.status === 'archived' ? undefined : item.status

  return {
    title: `${item.siteName ?? 'Site'} drawing markup review`,
    siteId: item.siteId,
    siteName: item.siteName ?? undefined,
    workDate: item.workDate ?? undefined,
    status: previewStatus,
    pages: [
      {
        id: item.id,
        title: item.attachmentName || `Drawing ${item.pageNo}`,
        storageBucket: 'drawings',
        storagePath: item.markedPath ?? item.originalPath,
        sourceLabel: 'drawing_markups',
        workDate: item.workDate ?? undefined,
        marks: item.marks,
      },
    ],
  }
}

function isActionable(item: DrawingMarkupReviewQueueItem): boolean {
  return item.status === 'pending' && item.approvalStatus === 'pending' && !item.lockedAt
}

function isLockable(item: DrawingMarkupReviewQueueItem): boolean {
  return item.status === 'approved' && item.approvalStatus === 'approved' && !item.lockedAt
}

export function DrawingMarkupReviewQueuePanel() {
  const {
    loadPendingQueue,
    approvePending,
    rejectPending,
    lockApproved,
    loading,
    submitting,
    error,
    isSiteManager,
  } = useDrawingMarkupReviewQueue()
  const [items, setItems] = useState<DrawingMarkupReviewQueueItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const refreshQueue = useCallback(async () => {
    const nextItems = await loadPendingQueue()
    setItems(nextItems)
    setSelectedId(current =>
      current && nextItems.some(item => item.id === current)
        ? current
        : nextItems[0]?.id ?? null
    )
    return nextItems
  }, [loadPendingQueue])

  useEffect(() => {
    let cancelled = false

    refreshQueue().catch(() => {
      if (cancelled) return
      setItems([])
    })

    return () => {
      cancelled = true
    }
  }, [refreshQueue])

  const selectedItem = useMemo(
    () => items.find(item => item.id === selectedId) ?? null,
    [items, selectedId]
  )

  const previewDocument = useMemo(
    () => (selectedItem ? buildPreviewDocument(selectedItem) : null),
    [selectedItem]
  )

  const handleApprove = async (item: DrawingMarkupReviewQueueItem) => {
    if (!isActionable(item)) return

    setActionMessage(null)
    await approvePending(item.id)
    setActionMessage('Drawing markup approved.')
    await refreshQueue()
  }

  const handleReject = async (item: DrawingMarkupReviewQueueItem) => {
    const reason = rejectReason.trim()
    if (!isActionable(item) || !reason) return

    setActionMessage(null)
    await rejectPending(item.id, reason)
    setActionMessage('Drawing markup rejected.')
    setRejectingId(null)
    setRejectReason('')
    await refreshQueue()
  }

  const handleLock = async (item: DrawingMarkupReviewQueueItem) => {
    if (!isLockable(item)) return

    setActionMessage(null)
    await lockApproved(item.id)
    setActionMessage('Drawing markup locked.')
    await refreshQueue()
  }

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-navy)]">Drawing Markup Review Queue</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Review pending drawing markups, then approve, reject, or lock approved records.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          {isSiteManager ? 'site_manager scope' : 'admin scope'}
        </span>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        This PR only supports approved to locked finalization after review. Document registration, Storage export, and partner publication are not included.
      </div>

      {actionMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
          Loading drawing markup review queue.
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
          No pending drawing markups.
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
                  onClick={() => {
                    setSelectedId(item.id)
                    setRejectingId(null)
                    setRejectReason('')
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-[var(--color-accent)] bg-sky-50'
                      : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-soft)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {item.attachmentName || `Attachment ${item.attachmentId.slice(0, 8)}`}
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-1.5">
                      <MapPinned className="h-3.5 w-3.5" strokeWidth={1.9} />
                      <span className="truncate">{item.siteName || item.siteId}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileSearch className="h-3.5 w-3.5" strokeWidth={1.9} />
                      <span>Requester {item.requesterName || item.createdBy.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers3 className="h-3.5 w-3.5" strokeWidth={1.9} />
                      <span>mark {item.marks.length} / page {item.pageNo}</span>
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
                <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {selectedItem.attachmentName || selectedItem.attachmentId}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                      <span>Site: {selectedItem.siteName || selectedItem.siteId}</span>
                      <span>Work date: {selectedItem.workDate || '-'}</span>
                      <span>Requester: {selectedItem.requesterName || selectedItem.createdBy.slice(0, 8)}</span>
                      <span>Status: {selectedItem.status} / {selectedItem.approvalStatus}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={submitting || !isActionable(selectedItem)}
                      onClick={() => {
                        void handleApprove(selectedItem)
                      }}
                      className="flex h-8 items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={submitting || !isActionable(selectedItem)}
                      onClick={() => {
                        setRejectingId(selectedItem.id)
                        setRejectReason('')
                      }}
                      className="flex h-8 items-center gap-1.5 rounded-md bg-red-50 px-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={submitting || !isLockable(selectedItem)}
                      onClick={() => {
                        void handleLock(selectedItem)
                      }}
                      className="flex h-8 items-center gap-1.5 rounded-md bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <LockKeyhole className="h-3.5 w-3.5" />
                      Lock
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)]"
                      aria-label="Close preview"
                      title="Close preview"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {rejectingId === selectedItem.id && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <label className="text-xs font-semibold text-red-700" htmlFor="drawing-markup-reject-reason">
                      Rejection reason
                    </label>
                    <textarea
                      id="drawing-markup-reject-reason"
                      rows={3}
                      value={rejectReason}
                      onChange={event => setRejectReason(event.target.value)}
                      className="mt-2 w-full resize-none rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-red-400"
                      placeholder="Enter a rejection reason."
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={submitting || !rejectReason.trim()}
                        onClick={() => {
                          void handleReject(selectedItem)
                        }}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? 'Rejecting...' : 'Confirm reject'}
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setRejectingId(null)
                          setRejectReason('')
                        }}
                        className="rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-soft)] disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <DrawingMarkupMultiPagePreview document={previewDocument} />
              </div>
            ) : (
              <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-white px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
                Select a drawing markup item to open a read-only preview.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
