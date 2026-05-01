'use client'

import { useMemo } from 'react'
import { HardHat, ClipboardList, Package, ImageIcon, Calendar } from 'lucide-react'
import { ReportPreviewWorkspace } from '../ReportPreviewWorkspace'
import type { WorklogReportDocument } from './report-document-types'

interface WorklogReportPreviewProps {
  document: WorklogReportDocument
}

/**
 * WorklogReportPreview - Read-only worklog report renderer.
 * Renders worklog data (workers, tasks, materials, media) in A4 paper layout.
 */
export function WorklogReportPreview({ document }: WorklogReportPreviewProps) {
  const {
    title,
    siteId,
    siteName,
    workDate,
    status,
    workerArray,
    taskTags,
    materialItems,
    mediaInfo,
    approvedAt,
    rejectedReason,
  } = document

  const totalWorkers = useMemo(() => {
    return workerArray.reduce((sum, w) => sum + w.count, 0)
  }, [workerArray])

  const photoCount = useMemo(() => {
    return mediaInfo?.attachments?.filter(a => a.kind === 'photo').length ?? 0
  }, [mediaInfo])

  const formatManDay = (value: number) => {
    if (Number.isInteger(value)) return `${value}`
    return value.toFixed(1)
  }

  return (
    <ReportPreviewWorkspace
      kind="worklog_report"
      title={title}
      siteId={siteId}
      siteName={siteName}
      workDate={workDate}
      status={status}
    >
      <div className="flex flex-col gap-4">
        {/* Work Date */}
        {workDate && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Calendar className="h-4 w-4" strokeWidth={1.9} />
            <span>{new Date(workDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        )}

        {/* Workers Section */}
        <div className="rounded-xl border border-[var(--color-border)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
            <HardHat className="h-4 w-4 text-[var(--color-accent)]" strokeWidth={1.9} />
            <span className="font-semibold text-[var(--color-text-primary)]">출역 인원</span>
            <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {formatManDay(totalWorkers)}명
            </span>
          </div>
          <div className="p-4">
            {workerArray.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">입력된 인원이 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {workerArray.map((worker, i) => (
                  <span
                    key={`${worker.name}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
                  >
                    <span>{worker.name}</span>
                    <span className="text-xs text-blue-500">({formatManDay(worker.count)}공수)</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tasks Section */}
        <div className="rounded-xl border border-[var(--color-border)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
            <ClipboardList className="h-4 w-4 text-[var(--color-accent)]" strokeWidth={1.9} />
            <span className="font-semibold text-[var(--color-text-primary)]">작업 항목</span>
            <span className="ml-auto text-xs text-[var(--color-text-tertiary)]">{taskTags.length}개</span>
          </div>
          <div className="p-4">
            {taskTags.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">선택된 작업 항목이 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {taskTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Materials Section */}
        <div className="rounded-xl border border-[var(--color-border)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
            <Package className="h-4 w-4 text-[var(--color-accent)]" strokeWidth={1.9} />
            <span className="font-semibold text-[var(--color-text-primary)]">자재 투입</span>
            <span className="ml-auto text-xs text-[var(--color-text-tertiary)]">{materialItems.length}건</span>
          </div>
          <div className="p-4">
            {materialItems.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">투입된 자재가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {materialItems.map((item, i) => (
                  <div
                    key={`${item.name}-${i}`}
                    className="flex items-center justify-between rounded-lg bg-[var(--color-bg)] px-4 py-2.5 text-sm"
                  >
                    <span className="font-medium text-[var(--color-text)]">{item.name}</span>
                    <span className="text-[var(--color-text-secondary)]">수량: {item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Media Section */}
        <div className="rounded-xl border border-[var(--color-border)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
            <ImageIcon className="h-4 w-4 text-[var(--color-accent)]" strokeWidth={1.9} />
            <span className="font-semibold text-[var(--color-text-primary)]">사진 및 도면</span>
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {photoCount}장
            </span>
          </div>
          <div className="p-4">
            {photoCount === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">첨부된 사진이 없습니다.</p>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                {photoCount}장의 사진이 첨부되어 있습니다.
              </p>
            )}
          </div>
        </div>

        {/* Approval/Rejection */}
        {approvedAt && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700">
            <div className="font-semibold">승인 완료</div>
            <div className="mt-1 text-xs">
              {new Date(approvedAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        )}

        {rejectedReason && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <div className="font-semibold">반려 사유</div>
            <div className="mt-1">{rejectedReason}</div>
          </div>
        )}
      </div>
    </ReportPreviewWorkspace>
  )
}
