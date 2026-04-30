'use client'

import { CheckCircle2, FileCheck2 } from 'lucide-react'
import type { RequiredDocumentStatus, RequiredDocumentSummary } from '@/lib/documents/requiredDocuments'

const STATUS_LABELS: Record<RequiredDocumentStatus, string> = {
  missing: '미제출',
  reviewing: '검토중',
  approved: '승인완료',
  rejected: '반려',
  expired: '만료',
  syncing: '동기화대기',
}

export function RequiredDocumentProgressCard({
  summary,
  loading,
}: {
  summary: RequiredDocumentSummary | null
  loading: boolean
}) {
  const displaySummary = summary ?? {
    items: [],
    counts: {
      missing: 0,
      reviewing: 0,
      approved: 0,
      rejected: 0,
      expired: 0,
      syncing: 0,
    },
    percent: 0,
  }

  return (
    <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-[var(--color-accent)]" strokeWidth={1.9} />
            <h2 className="text-base font-semibold text-[var(--color-navy)]">필수서류 진행률</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {loading ? '서류 상태를 확인하는 중입니다.' : `${displaySummary.counts.approved}/${displaySummary.items.length || 7}종 승인완료`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[var(--color-navy)]">{displaySummary.percent}%</div>
          <div className="text-xs text-[var(--color-text-tertiary)]">완료율</div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${displaySummary.percent}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(Object.keys(STATUS_LABELS) as RequiredDocumentStatus[]).map(status => (
          <div key={status} className="rounded-xl bg-[var(--color-bg)] px-3 py-2">
            <div className="text-xs text-[var(--color-text-tertiary)]">{STATUS_LABELS[status]}</div>
            <div className="mt-0.5 font-semibold text-[var(--color-text)]">{displaySummary.counts[status]}건</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {displaySummary.items.map(({ type, status }) => (
          <span
            key={type}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              status === 'approved'
                ? 'bg-green-50 text-green-700'
                : status === 'rejected'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {status === 'approved' && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />}
            {type}
          </span>
        ))}
      </div>
    </section>
  )
}
