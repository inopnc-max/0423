'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createSignedPreviewUrl } from '@/lib/storage/storage-helper'
import { ReportPreviewWorkspace } from '../ReportPreviewWorkspace'
import type { IssueReportDocument, IssueReportPhotoItem } from './report-document-types'

interface IssueReportPreviewProps {
  document: IssueReportDocument
}

interface PhotoState {
  id: string
  url: string | null
  loading: boolean
  failed: boolean
}

const PHOTO_GRID_STYLES = `
.grid-photo {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.grid-photo-item {
  position: relative;
  aspect-ratio: 1;
  background: #f1f5f9;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border, #e2e8f0);
}
.grid-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.grid-photo-badge {
  position: absolute;
  left: 4px;
  top: 4px;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 600;
  color: white;
}
.grid-photo-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: rgba(0,0,0,0.5);
  font-size: 10px;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`

function PhotoGridItem({
  item,
  onLoad,
}: {
  item: IssueReportPhotoItem
  onLoad: (item: IssueReportPhotoItem, url: string | null) => void
}) {
  const [photoState, setPhotoState] = useState<PhotoState>({
    id: item.id,
    url: null,
    loading: true,
    failed: false,
  })
  const cancelledRef = useRef(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    loadedRef.current = false
    return () => { cancelledRef.current = true }
  }, [item.id])

  const loadPhoto = useCallback(async () => {
    if (!item.storageBucket || !item.storagePath) return
    if (loadedRef.current) return

    loadedRef.current = true

    try {
      const supabase = createClient()
      const url = await createSignedPreviewUrl({
        supabase,
        bucket: item.storageBucket,
        path: item.storagePath,
        expiresIn: 3600,
      })
      if (!cancelledRef.current) {
        if (url) {
          setPhotoState({ id: item.id, url, loading: false, failed: false })
          onLoad(item, url)
        } else {
          setPhotoState({ id: item.id, url: null, loading: false, failed: true })
          onLoad(item, null)
        }
      }
    } catch {
      if (!cancelledRef.current) {
        setPhotoState({ id: item.id, url: null, loading: false, failed: true })
        onLoad(item, null)
      }
    }
  }, [item, onLoad])

  useEffect(() => {
    void loadPhoto()
  }, [loadPhoto])

  return (
    <div className="grid-photo-item">
      {photoState.loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-text-tertiary)]" />
        </div>
      )}
      {photoState.url && !photoState.failed && (
        <img src={photoState.url} alt={item.caption ?? item.fileName} className="grid-photo-img" />
      )}
      {(photoState.failed || !photoState.url) && !photoState.loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <Camera className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          <span className="text-[9px] text-[var(--color-text-tertiary)]">불가</span>
        </div>
      )}
      {item.statusLabel && (
        <div className="grid-photo-badge" style={{ background: 'rgba(220,38,38,0.8)' }}>
          {item.statusLabel}
        </div>
      )}
      {item.caption && (
        <div className="grid-photo-caption">{item.caption}</div>
      )}
    </div>
  )
}

function PhotoSection({
  title,
  items,
  emptyText,
  accentColor,
}: {
  title: string
  items: IssueReportPhotoItem[]
  emptyText: string
  accentColor: string
}) {
  const [, forceUpdate] = useState({})
  const photoUrlsRef = useRef<Record<string, string | null>>({})

  const onPhotoLoad = useCallback((item: IssueReportPhotoItem, url: string | null) => {
    photoUrlsRef.current[item.id] = url
  }, [])

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-white">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2.5">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</span>
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">0</span>
        </div>
        <div className="p-6 text-center text-sm text-[var(--color-text-tertiary)]">{emptyText}</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2.5">
        <span className={`text-sm font-semibold`} style={{ color: accentColor }}>{title}</span>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{items.length}</span>
      </div>
      <div className="p-3">
        <div className="grid-photo">
          {items.map(item => (
            <PhotoGridItem key={item.id} item={item} onLoad={onPhotoLoad} />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * IssueReportPreview - Read-only issue report renderer.
 * Renders issue reports with before/after photos in A4 paper layout.
 */
export function IssueReportPreview({ document }: IssueReportPreviewProps) {
  const {
    title,
    siteId,
    siteName,
    workDate,
    status,
    description,
    beforePhotos,
    afterPhotos,
    otherPhotos,
    updatedAt,
  } = document

  return (
    <ReportPreviewWorkspace
      kind="issue_report"
      title={title}
      siteId={siteId}
      siteName={siteName}
      workDate={workDate}
      status={status}
    >
      <style dangerouslySetInnerHTML={{ __html: PHOTO_GRID_STYLES }} />
      <div className="flex flex-col gap-4">
        {/* Description */}
        {description && (
          <div className="rounded-xl border border-[var(--color-border)] bg-white">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" strokeWidth={1.9} />
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">이상 내용</span>
            </div>
            <div className="p-4">
              <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)] leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        )}

        {/* Photo Sections */}
        <PhotoSection
          title="조치 전 사진"
          items={beforePhotos}
          emptyText="조치 전 사진이 없습니다."
          accentColor="#ea580c"
        />
        <PhotoSection
          title="조치 후 사진"
          items={afterPhotos}
          emptyText="조치 후 사진이 없습니다."
          accentColor="#16a34a"
        />
        {otherPhotos.length > 0 && (
          <PhotoSection
            title="기타 사진"
            items={otherPhotos}
            emptyText="기타 사진이 없습니다."
            accentColor="#6b7280"
          />
        )}

        {/* Last Updated */}
        {updatedAt && (
          <div className="text-center text-xs text-[var(--color-text-tertiary)]">
            최종 수정: {new Date(updatedAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        )}
      </div>
    </ReportPreviewWorkspace>
  )
}
