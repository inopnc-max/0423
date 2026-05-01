'use client'

import { useEffect, useState, useCallback } from 'react'
import { History, Download, Eye, Clock, Loader2 } from 'lucide-react'
import { useDocumentVersions } from '@/hooks/useDocumentActions'
import type { DocumentVersionRow } from '@/lib/documents/document-types'

interface DocumentVersionPanelProps {
  documentId: string
  currentVersionNo?: number
  onPreviewVersion?: (version: DocumentVersionRow) => void
  onDownloadVersion?: (version: DocumentVersionRow) => void
}

/**
 * DocumentVersionPanel - Version history display for a document.
 *
 * Features:
 * - List all versions ordered by version number (newest first)
 * - Highlight current version
 * - Preview and download actions per version
 * - Shows version metadata (created by, timestamp, file size)
 */
export function DocumentVersionPanel({
  documentId,
  currentVersionNo,
  onPreviewVersion,
  onDownloadVersion,
}: DocumentVersionPanelProps) {
  const { versions, loadVersions, loading, error } = useDocumentVersions()
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)

  useEffect(() => {
    void loadVersions(documentId)
  }, [documentId, loadVersions])

  const handlePreview = useCallback((version: DocumentVersionRow) => {
    setSelectedVersionId(version.id)
    onPreviewVersion?.(version)
  }, [onPreviewVersion])

  const handleDownload = useCallback((version: DocumentVersionRow) => {
    onDownloadVersion?.(version)
  }, [onDownloadVersion])

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-white py-8">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[var(--color-text-tertiary)]" />
        <span className="text-sm text-[var(--color-text-tertiary)]">버전 내역을 불러오는 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-white py-8 text-center">
        <History className="mb-2 h-8 w-8 text-[var(--color-text-tertiary)]" strokeWidth={1.5} />
        <p className="text-sm text-[var(--color-text-secondary)]">버전 내역이 없습니다.</p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          문서를 저장하면 첫 번째 버전이 생성됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            버전 내역
          </span>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {versions.length}개
        </span>
      </div>

      <div className="space-y-2">
        {versions.map((version) => {
          const isCurrent = currentVersionNo !== undefined && version.version_no === currentVersionNo
          const isSelected = selectedVersionId === version.id

          return (
            <div
              key={version.id}
              className={`group rounded-xl border-2 p-3 transition ${
                isCurrent
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                  : isSelected
                  ? 'border-[var(--color-accent)] bg-[var(--color-bg)]'
                  : 'border-[var(--color-border)] bg-white hover:border-[var(--color-accent)]'
              }`}
            >
              {/* Version header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                    isCurrent
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    v{version.version_no}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      현재 버전
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onPreviewVersion && (
                    <button
                      type="button"
                      onClick={() => handlePreview(version)}
                      className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)]"
                      title="미리보기"
                    >
                      <Eye className="h-3 w-3" />
                      미리보기
                    </button>
                  )}
                  {onDownloadVersion && (
                    <button
                      type="button"
                      onClick={() => handleDownload(version)}
                      className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)]"
                      title="다운로드"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Version meta */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" strokeWidth={1.9} />
                  {new Date(version.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                {version.file_size_bytes && (
                  <span>
                    {(version.file_size_bytes / 1024).toFixed(1)} KB
                  </span>
                )}

                {version.mime_type && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">
                    {version.mime_type.split('/')[1]?.toUpperCase() ?? version.mime_type}
                  </span>
                )}

                {version.checksum && (
                  <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
                    {version.checksum.slice(0, 8)}...
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
