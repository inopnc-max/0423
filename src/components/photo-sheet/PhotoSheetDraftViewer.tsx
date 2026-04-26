'use client'

import { useState, useEffect, useCallback } from 'react'
import { ImageIcon } from 'lucide-react'
import type { PhotoSheetDraft } from '@/lib/photo-sheet-mapping'
import { createClient } from '@/lib/supabase/client'
import { createSignedPreviewUrl } from '@/lib/storage/storage-helper'

type PhotoSheetDraftViewerProps = {
  draft: PhotoSheetDraft
}

/**
 * PhotoSheetDraftViewer - PhotoSheetDraft read-only viewer component.
 *
 * Displays PhotoSheetDraft data with signed URL-based image rendering.
 * Uses Supabase browser client (not service role) for signed URL generation.
 */
export function PhotoSheetDraftViewer({ draft }: PhotoSheetDraftViewerProps) {
  const { title, siteId, workDate, items } = draft

  const [signedUrls, setSignedUrls] = useState<Record<string, string | null>>({})
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [failedItems, setFailedItems] = useState<Set<string>>(new Set())

  const generateSignedUrls = useCallback(async () => {
    const supabase = createClient()

    for (const item of items) {
      if (item.storageBucket === 'photos' && item.storagePath) {
        setLoadingItems(prev => new Set(prev).add(item.id))

        try {
          const url = await createSignedPreviewUrl({
            supabase,
            bucket: item.storageBucket,
            path: item.storagePath,
            expiresIn: 3600,
          })
          setSignedUrls(prev => ({ ...prev, [item.id]: url }))
          if (!url) {
            setFailedItems(prev => new Set(prev).add(item.id))
          }
        } catch {
          setFailedItems(prev => new Set(prev).add(item.id))
        } finally {
          setLoadingItems(prev => {
            const next = new Set(prev)
            next.delete(item.id)
            return next
          })
        }
      }
    }
  }, [items])

  useEffect(() => {
    void generateSignedUrls()
  }, [generateSignedUrls])

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
          {items.map((item) => {
            const signedUrl = signedUrls[item.id]
            const isLoading = loadingItems.has(item.id)
            const hasFailed = failedItems.has(item.id)
            const showImage = signedUrl && !isLoading && !hasFailed

            return (
              <div
                key={item.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4"
              >
                <div className="flex flex-col gap-2">
                  {/* Image preview */}
                  {item.storageBucket === 'photos' && item.storagePath && (
                    <div className="mb-2">
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-text-tertiary)]" />
                          이미지 불러오는 중...
                        </div>
                      ) : showImage ? (
                        <img
                          src={signedUrl}
                          alt={item.caption || item.fileName}
                          className="max-h-64 rounded-lg object-contain"
                        />
                      ) : hasFailed ? (
                        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 text-sm text-[var(--color-text-tertiary)]">
                          <ImageIcon className="h-5 w-5" />
                          이미지 미리보기 불가
                        </div>
                      ) : null}
                    </div>
                  )}

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
            )
          })}
        </div>
      )}
    </div>
  )
}
