'use client'

import type { PhotoSheetDraft } from '@/lib/photo-sheet-mapping'

type PhotoSheetDraftViewerProps = {
  draft: PhotoSheetDraft
}

/**
 * PhotoSheetDraftViewer - PhotoSheetDraft read-only viewer component.
 *
 * Displays PhotoSheetDraft data for future use in PreviewCenter or photo sheet screens.
 * No image rendering, no Supabase calls, no PDF generation in this PR.
 */
export function PhotoSheetDraftViewer({ draft }: PhotoSheetDraftViewerProps) {
  const { title, siteId, workDate, items } = draft

  return (
    <div className="flex flex-col gap-4">
      {/* Header info */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-secondary)]">
          <span>현장 ID: {siteId}</span>
          <span>작업일: {workDate}</span>
          <span>항목 수: {items.length}</span>
        </div>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-text-secondary)]">
          사진대지 항목이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-[var(--color-text-primary)]">{item.title}</span>
                  <span className="rounded-full bg-[var(--color-bg-soft)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                    {item.statusLabel}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">{item.caption}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
                  <span>파일: {item.fileName}</span>
                  <span>상태: {item.status}</span>
                </div>
                <span className="text-xs text-[var(--color-text-disabled)]">path: {item.storagePath}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
