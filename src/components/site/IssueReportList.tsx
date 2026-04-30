'use client'

import { AlertTriangle, Camera, Loader2 } from 'lucide-react'
import {
  getIssueReportPhotoCount,
  getIssueReportTitle,
  textValue,
  type IssueReportRow,
} from '@/lib/site/siteRecords'

export function IssueReportPreview({ report }: { report: IssueReportRow }) {
  return (
    <div className="space-y-4 p-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-sm text-[var(--color-text-secondary)]">제목</div>
        <div className="mt-1 text-xl font-bold text-[var(--color-navy)]">{getIssueReportTitle(report)}</div>
        <div className="mt-3 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 w-fit">
          {textValue(report.status, 'approved')}
        </div>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-[var(--color-navy)]">보고서 정보</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-[var(--color-bg)] p-3">
            <div className="text-xs text-[var(--color-text-tertiary)]">등록일</div>
            <div className="mt-1 font-semibold text-[var(--color-text)]">
              {report.created_at ? new Date(report.created_at).toLocaleDateString('ko-KR') : '-'}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--color-bg)] p-3">
            <div className="text-xs text-[var(--color-text-tertiary)]">연결 사진</div>
            <div className="mt-1 font-semibold text-[var(--color-text)]">{getIssueReportPhotoCount(report)}건</div>
          </div>
        </div>
      </section>
    </div>
  )
}

export function IssueReportList({
  reports,
  loading,
  onPreview,
}: {
  reports: IssueReportRow[]
  loading: boolean
  onPreview: (report: IssueReportRow) => void
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-navy)]">조치보고서</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">approved, shared, closed 상태만 표시합니다.</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{reports.length}건</span>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-sm text-[var(--color-text-secondary)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.9} />
          조치보고서를 불러오는 중입니다.
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
          공유 가능한 조치보고서가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, index) => (
            <button
              key={report.id ?? `${getIssueReportTitle(report)}-${index}`}
              type="button"
              onClick={() => onPreview(report)}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white p-4 text-left transition hover:border-[var(--color-accent)] hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-[var(--color-text)]">{getIssueReportTitle(report)}</span>
                  <span className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                      {textValue(report.status, 'approved')}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      <Camera className="h-3 w-3" strokeWidth={1.9} />
                      사진 {getIssueReportPhotoCount(report)}
                    </span>
                    {report.created_at && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {new Date(report.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
