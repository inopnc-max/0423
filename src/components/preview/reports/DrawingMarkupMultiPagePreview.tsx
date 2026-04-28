'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createSignedPreviewUrl } from '@/lib/storage/storage-helper'
import { ReportPreviewWorkspace } from '../ReportPreviewWorkspace'
import type {
  DrawingMarkupPreviewDocument,
  DrawingMarkupPreviewPage,
  DrawingMarkupMark,
  DrawingMarkupPoint,
} from './drawing-markup-preview-types'

interface DrawingMarkupMultiPagePreviewProps {
  document: DrawingMarkupPreviewDocument
}

const VIEW_BOX_SIZE = 1000

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function isValidPoint(point: unknown): point is DrawingMarkupPoint {
  if (!point || typeof point !== 'object') return false
  const p = point as Record<string, unknown>
  return (
    typeof p.x === 'number' &&
    typeof p.y === 'number' &&
    !isNaN(p.x as number) &&
    !isNaN(p.y as number)
  )
}

function toViewBoxPoint(point: DrawingMarkupPoint): { x: number; y: number } {
  return {
    x: Math.round(clamp01(point.x) * VIEW_BOX_SIZE),
    y: Math.round(clamp01(point.y) * VIEW_BOX_SIZE),
  }
}

function buildPolylinePoints(points: DrawingMarkupPoint[]): string {
  const validPoints = points.filter(isValidPoint)
  if (validPoints.length === 0) return ''

  return validPoints
    .map(toViewBoxPoint)
    .map((p) => `${p.x},${p.y}`)
    .join(' ')
}

function buildPolygonPoints(points: DrawingMarkupPoint[]): string {
  const validPoints = points.filter(isValidPoint)
  if (validPoints.length < 3) return ''

  return validPoints
    .map(toViewBoxPoint)
    .map((p) => `${p.x},${p.y}`)
    .join(' ')
}

function normalizeMarks(marks?: DrawingMarkupMark[]): DrawingMarkupMark[] {
  if (!marks || !Array.isArray(marks)) return []

  return marks.filter((mark) => {
    if (!mark || typeof mark !== 'object') return false
    if (mark.type === 'brush') {
      return Array.isArray(mark.points) && mark.points.some(isValidPoint)
    }
    if (mark.type === 'polygon-area') {
      return Array.isArray(mark.points) && mark.points.length >= 3
    }
    return false
  })
}

function MarkupOverlay({ marks }: { marks: DrawingMarkupMark[] }) {
  const normalizedMarks = normalizeMarks(marks)

  if (normalizedMarks.length === 0) return null

  return (
    <svg
      viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      {normalizedMarks.map((mark, index) => {
        if (mark.type === 'brush') {
          const points = buildPolylinePoints(mark.points)
          if (!points) return null

          const width = Math.max(1, Math.round((mark.width ?? 0.01) * VIEW_BOX_SIZE))

          return (
            <polyline
              key={`brush-${index}`}
              points={points}
              fill="none"
              stroke={mark.color ?? '#dc2626'}
              strokeWidth={width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        }

        if (mark.type === 'polygon-area') {
          const points = buildPolygonPoints(mark.points)
          if (!points) return null

          const lineWidth = Math.max(1, Math.round((mark.lineWidth ?? 0.005) * VIEW_BOX_SIZE))

          return (
            <polygon
              key={`polygon-${index}`}
              points={points}
              fill={mark.fillColor ?? 'rgba(220, 38, 38, 0.2)'}
              stroke={mark.strokeColor ?? '#dc2626'}
              strokeWidth={lineWidth}
            />
          )
        }

        return null
      })}
    </svg>
  )
}

function PageCard({
  page,
  index,
  totalPages,
  getImageUrl,
  isLoading,
  hasFailed,
}: {
  page: DrawingMarkupPreviewPage
  index: number
  totalPages: number
  getImageUrl: (page: DrawingMarkupPreviewPage) => string | null | undefined
  isLoading: boolean
  hasFailed: boolean
}) {
  const imageUrl = getImageUrl(page)
  const hasMarks = (page.marks?.length ?? 0) > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="mx-auto w-full max-w-[794px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-md">
        <div className="flex h-8 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-xs font-semibold text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-2 truncate">
            <span className="truncate">{page.title}</span>
            {page.sourceLabel && (
              <span className="shrink-0 rounded bg-[var(--color-bg-soft)] px-1.5 py-0.5 text-[10px] font-normal">
                {page.sourceLabel}
              </span>
            )}
          </div>
          <span className="shrink-0 pl-2 text-[10px] font-normal text-[var(--color-text-tertiary)]">
            {index + 1} / {totalPages}
          </span>
        </div>

        <div className="relative bg-slate-100" style={{ minHeight: '400px' }}>
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-text-tertiary)]" />
              <span className="text-sm text-[var(--color-text-tertiary)]">도면을 불러오는 중...</span>
            </div>
          ) : hasFailed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
              <ImageIcon className="h-8 w-8 text-[var(--color-text-tertiary)]" />
              <span className="text-sm text-[var(--color-text-tertiary)]">도면 미리보기를 불러오지 못했습니다.</span>
            </div>
          ) : imageUrl ? (
            <div className="relative w-full">
              <img
                src={imageUrl}
                alt={page.title}
                className="h-full w-full object-contain"
                style={{ minHeight: '400px' }}
              />
              {hasMarks && <MarkupOverlay marks={page.marks ?? []} />}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
              <ImageIcon className="h-8 w-8 text-[var(--color-text-tertiary)]" />
              <span className="text-sm text-[var(--color-text-tertiary)]">도면 이미지 경로가 없습니다.</span>
            </div>
          )}
        </div>

        <div className="flex h-6 items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-[10px] text-[var(--color-text-tertiary)]">
          <span>{page.workDate ?? ''}</span>
          {!hasMarks && imageUrl && (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] text-slate-500">마킹 없음</span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * DrawingMarkupMultiPagePreview - Read-only multi-page drawing markup preview renderer.
 *
 * Renders drawing markup documents with:
 * - Multiple pages displayed vertically
 * - SVG overlay for brush and polygon-area marks
 * - Signed URL support for Supabase storage
 * - Empty/loading/error state handling
 *
 * Note: This is a read-only renderer. No editing, saving, or markup creation.
 */
export function DrawingMarkupMultiPagePreview({ document }: DrawingMarkupMultiPagePreviewProps) {
  const { title, siteId, siteName, workDate, status, pages } = document

  const [signedUrls, setSignedUrls] = useState<Record<string, string | null>>({})
  const [loadingPages, setLoadingPages] = useState<Set<string>>(new Set())
  const [failedPages, setFailedPages] = useState<Set<string>>(new Set())

  const signedUrlsRef = useRef(signedUrls)
  const loadingPagesRef = useRef(loadingPages)
  const failedPagesRef = useRef(failedPages)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  useEffect(() => {
    signedUrlsRef.current = signedUrls
  }, [signedUrls])

  useEffect(() => {
    loadingPagesRef.current = loadingPages
  }, [loadingPages])

  useEffect(() => {
    failedPagesRef.current = failedPages
  }, [failedPages])

  const generateSignedUrl = useCallback(async (page: DrawingMarkupPreviewPage) => {
    if (!page.storageBucket || !page.storagePath) return

    if (cancelledRef.current) return
    if (signedUrlsRef.current[page.id]) return
    if (failedPagesRef.current.has(page.id)) return
    if (loadingPagesRef.current.has(page.id)) return

    const nextLoading = new Set(loadingPagesRef.current)
    nextLoading.add(page.id)
    loadingPagesRef.current = nextLoading
    setLoadingPages(nextLoading)

    try {
      const supabase = createClient()
      const url = await createSignedPreviewUrl({
        supabase,
        bucket: page.storageBucket,
        path: page.storagePath,
        expiresIn: 3600,
      })

      if (cancelledRef.current) return

      if (url) {
        signedUrlsRef.current = { ...signedUrlsRef.current, [page.id]: url }
        setSignedUrls({ ...signedUrlsRef.current })
      } else {
        const nextFailed = new Set(failedPagesRef.current)
        nextFailed.add(page.id)
        failedPagesRef.current = nextFailed
        setFailedPages(nextFailed)
      }
    } catch {
      if (cancelledRef.current) return

      const nextFailed = new Set(failedPagesRef.current)
      nextFailed.add(page.id)
      failedPagesRef.current = nextFailed
      setFailedPages(nextFailed)
    } finally {
      if (cancelledRef.current) return

      const finalLoading = new Set(loadingPagesRef.current)
      finalLoading.delete(page.id)
      loadingPagesRef.current = finalLoading
      setLoadingPages(finalLoading)
    }
  }, [])

  useEffect(() => {
    for (const page of pages) {
      if (page.storageBucket && page.storagePath) {
        void generateSignedUrl(page)
      }
    }
  }, [pages, generateSignedUrl])

  const getImageUrl = useCallback(
    (page: DrawingMarkupPreviewPage): string | null | undefined => {
      if (page.storageBucket && page.storagePath) {
        return signedUrls[page.id] ?? undefined
      }
      return page.imageUrl
    },
    [signedUrls]
  )

  if (pages.length === 0) {
    return (
      <ReportPreviewWorkspace
        kind="drawing_markup"
        title={title}
        siteId={siteId}
        siteName={siteName}
        workDate={workDate}
        status={status}
      >
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12 text-center">
          <ImageIcon className="mb-3 h-10 w-10 text-[var(--color-text-tertiary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">도면마킹 미리보기 항목이 없습니다.</p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            도면 이미지가 첨부된 작업일지만 미리보기를 생성할 수 있습니다.
          </p>
        </div>
      </ReportPreviewWorkspace>
    )
  }

  return (
    <ReportPreviewWorkspace
      kind="drawing_markup"
      title={title}
      siteId={siteId}
      siteName={siteName}
      workDate={workDate}
      status={status}
    >
      <div className="flex w-full flex-col gap-6">
        {pages.map((page, index) => (
          <PageCard
            key={page.id}
            page={page}
            index={index}
            totalPages={pages.length}
            getImageUrl={getImageUrl}
            isLoading={loadingPages.has(page.id)}
            hasFailed={failedPages.has(page.id)}
          />
        ))}
      </div>
    </ReportPreviewWorkspace>
  )
}
