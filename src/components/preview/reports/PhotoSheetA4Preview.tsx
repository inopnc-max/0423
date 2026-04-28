'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ImageIcon } from 'lucide-react'
import type { PhotoSheetDraft } from '@/lib/photo-sheet-mapping'
import { createClient } from '@/lib/supabase/client'
import { createSignedPreviewUrl } from '@/lib/storage/storage-helper'
import { ReportPreviewWorkspace } from '../ReportPreviewWorkspace'

const ITEMS_PER_PAGE = 6

interface PhotoSheetA4PreviewProps {
  draft: PhotoSheetDraft
}

/**
 * PhotoSheetA4Preview - A4 2-column x 3-row photo sheet preview renderer.
 *
 * - Read-only (no edit, zoom, pan, drag)
 * - Shows PhotoSheetDraft items in A4 paper layout
 * - 6 items per page (2x3 grid)
 * - Auto-paginates when items > 6
 * - Generates signed URLs for 'photos' bucket items
 * - Handles loading, error, and empty states gracefully
 */
export function PhotoSheetA4Preview({ draft }: PhotoSheetA4PreviewProps) {
  const { title, siteId, workDate, items } = draft

  const [signedUrls, setSignedUrls] = useState<Record<string, string | null>>({})
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [failedItems, setFailedItems] = useState<Set<string>>(new Set())

  const signedUrlsRef = useRef(signedUrls)
  const loadingItemsRef = useRef(loadingItems)
  const failedItemsRef = useRef(failedItems)

  useEffect(() => { signedUrlsRef.current = signedUrls }, [signedUrls])
  useEffect(() => { loadingItemsRef.current = loadingItems }, [loadingItems])
  useEffect(() => { failedItemsRef.current = failedItems }, [failedItems])

  const generateSignedUrls = useCallback(async () => {
    const pendingItems = items.filter(item =>
      item.storageBucket === 'photos' &&
      item.storagePath &&
      !signedUrlsRef.current[item.id] &&
      !failedItemsRef.current.has(item.id) &&
      !loadingItemsRef.current.has(item.id)
    )

    if (pendingItems.length === 0) return

    const supabase = createClient()

    for (const item of pendingItems) {
      if (signedUrlsRef.current[item.id]) continue
      if (failedItemsRef.current.has(item.id)) continue
      if (loadingItemsRef.current.has(item.id)) continue

      const nextLoading = new Set(loadingItemsRef.current)
      nextLoading.add(item.id)
      loadingItemsRef.current = nextLoading
      setLoadingItems(nextLoading)

      try {
        const url = await createSignedPreviewUrl({
          supabase,
          bucket: item.storageBucket,
          path: item.storagePath,
          expiresIn: 3600,
        })

        if (url) {
          signedUrlsRef.current = { ...signedUrlsRef.current, [item.id]: url }
          setSignedUrls({ ...signedUrlsRef.current })
        } else {
          const nextFailed = new Set(failedItemsRef.current)
          nextFailed.add(item.id)
          failedItemsRef.current = nextFailed
          setFailedItems(nextFailed)
        }
      } catch {
        const nextFailed = new Set(failedItemsRef.current)
        nextFailed.add(item.id)
        failedItemsRef.current = nextFailed
        setFailedItems(nextFailed)
      } finally {
        const finalLoading = new Set(loadingItemsRef.current)
        finalLoading.delete(item.id)
        loadingItemsRef.current = finalLoading
        setLoadingItems(finalLoading)
      }
    }
  }, [items])

  useEffect(() => {
    void generateSignedUrls()
  }, [generateSignedUrls])

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE))
  const pages: typeof items[] = []
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE))
  }

  if (items.length === 0) {
    return (
      <ReportPreviewWorkspace
        kind="photo_sheet"
        title={title}
        siteId={siteId}
        workDate={workDate}
        status="draft"
      >
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12 text-center">
          <ImageIcon className="mb-3 h-10 w-10 text-[var(--color-text-tertiary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">사진대지 항목이 없습니다.</p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            현장 사진이 첨부된 작업일지만 미리보기를 생성할 수 있습니다.
          </p>
        </div>
      </ReportPreviewWorkspace>
    )
  }

  return (
    <ReportPreviewWorkspace
      kind="photo_sheet"
      title={title}
      siteId={siteId}
      workDate={workDate}
      status="draft"
    >
      <div className="flex flex-col gap-6">
        {pages.map((pageItems, pageIndex) => (
          <div key={pageIndex} className="flex flex-col gap-2">
            <div
              className="bg-white shadow-md mx-auto w-full overflow-hidden"
              style={{ aspectRatio: '210 / 297', maxWidth: '794px' }}
            >
              <div className="flex h-7 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                <span className="truncate">{title}</span>
                <span className="shrink-0 pl-2 text-[10px] font-normal text-[var(--color-text-tertiary)]">
                  {pageIndex + 1} / {totalPages}
                </span>
              </div>

              <div className="grid h-full grid-cols-2 grid-rows-3">
                {pageItems.map((item) => {
                  const signedUrl = signedUrls[item.id]
                  const isLoading = loadingItems.has(item.id)
                  const hasFailed = failedItems.has(item.id)
                  const showImage = signedUrl && !isLoading && !hasFailed

                  return (
                    <div
                      key={item.id}
                      className="relative flex flex-col overflow-hidden border border-[var(--color-border)]"
                      style={{
                        borderTopWidth: 1,
                        borderBottomWidth: pageItems.indexOf(item) >= (ITEMS_PER_PAGE - 3) ? 1 : 0,
                        borderLeftWidth: pageItems.indexOf(item) % 2 === 0 ? 1 : 0,
                        borderRightWidth: 1,
                      }}
                    >
                      <div className="relative flex-1 bg-slate-100">
                        {isLoading ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-text-tertiary)]" />
                          </div>
                        ) : showImage ? (
                          <img
                            src={signedUrl}
                            alt={item.caption || item.fileName}
                            className="h-full w-full object-cover"
                            style={{ minHeight: '100px' }}
                          />
                        ) : hasFailed ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
                            <ImageIcon className="h-6 w-6 text-[var(--color-text-tertiary)]" />
                            <span className="text-[10px] text-[var(--color-text-tertiary)]">이미지 미리보기 불가</span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
                            <ImageIcon className="h-6 w-6 text-[var(--color-text-tertiary)]" />
                            <span className="text-[10px] text-[var(--color-text-tertiary)]">이미지 경로 없음</span>
                          </div>
                        )}

                        {item.statusLabel && (
                          <div
                            className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[9px] font-semibold text-white ${
                              item.status === 'before_repair'
                                ? 'bg-orange-600/90'
                                : 'bg-emerald-600/90'
                            }`}
                          >
                            {item.statusLabel}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-[var(--color-border)] bg-white px-1.5 py-1">
                        {item.caption && (
                          <p className="truncate text-[10px] font-medium leading-tight text-[var(--color-text-primary)]">
                            {item.caption}
                          </p>
                        )}
                        <p className="truncate text-[9px] text-[var(--color-text-tertiary)]">
                          {item.fileName}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {Array.from({ length: ITEMS_PER_PAGE - pageItems.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="border border-[var(--color-border)] bg-slate-50"
                    style={{
                      borderTopWidth: 1,
                      borderBottomWidth: i >= (ITEMS_PER_PAGE - pageItems.length) - 3 ? 1 : 0,
                      borderLeftWidth: (pageItems.length + i) % 2 === 0 ? 1 : 0,
                      borderRightWidth: 1,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mx-auto max-w-[794px] text-center text-xs text-[var(--color-text-tertiary)]">
              {totalPages > 1 && (
                <span>
                  {siteId && <span>현장: {siteId} · </span>}
                  {workDate && <span>작업일: {workDate} · </span>}
                  <span>{pageIndex + 1} / {totalPages} 페이지</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </ReportPreviewWorkspace>
  )
}
