'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, FileText, XCircle } from 'lucide-react'
import type { SiteManagerLog, SiteManagerSummary } from '@/lib/site-manager/siteManagerRecords'

const STATUS_META = {
  draft: { label: '임시저장', className: 'bg-slate-100 text-slate-700', icon: FileText },
  pending: { label: '승인대기', className: 'bg-amber-50 text-amber-700', icon: Clock },
  approved: { label: '승인완료', className: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  rejected: { label: '반려', className: 'bg-red-50 text-red-700', icon: XCircle },
} as const

export function ApprovalSummary({
  summary,
  loading,
}: {
  summary: SiteManagerSummary
  loading: boolean
}) {
  const items = [
    { key: 'pending', label: '승인대기', value: summary.pending },
    { key: 'approved', label: '승인완료', value: summary.approved },
    { key: 'rejected', label: '반려', value: summary.rejected },
    { key: 'draft', label: '임시저장', value: summary.draft },
  ]

  return (
    <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(item => (
        <div key={item.key} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs text-[var(--color-text-secondary)]">{item.label}</div>
          <div className="mt-1 text-2xl font-bold text-[var(--color-navy)]">{loading ? '-' : item.value}</div>
        </div>
      ))}
    </section>
  )
}

export function ApprovalReviewTimeline({
  logs,
  loading,
  submitting,
  onApprove,
  onReject,
}: {
  logs: SiteManagerLog[]
  loading: boolean
  submitting: boolean
  onApprove: (logId: string) => void
  onReject: (input: { logId: string; workerId: string; reason: string }) => void
}) {
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[var(--color-navy)]">승인 타임라인</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">최근 일지의 작성, 승인, 반려 상태를 시간순으로 확인합니다.</p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">승인 목록을 불러오는 중입니다.</div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl bg-[var(--color-bg)] px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
          승인 검토할 일지가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {logs.slice(0, 8).map(log => {
            const meta = STATUS_META[log.status]
            const Icon = meta.icon
            return (
              <div key={log.id} className="relative pl-8">
                <div className="absolute left-3 top-8 bottom-0 w-px bg-[var(--color-border)]" />
                <div className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full ${meta.className}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                <div className="rounded-xl border border-[var(--color-border)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[var(--color-text)]">{log.siteName}</div>
                      <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {log.workDate} · 작성자 {log.workerName}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                  </div>
                  <div className="mt-3 text-sm text-[var(--color-text-secondary)]">
                    작업자 {log.workerCount}명 · 총 {log.totalManDay}공수
                  </div>
                  {log.rejectionReason && (
                    <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                      반려 사유: {log.rejectionReason}
                    </div>
                  )}
                  {log.status === 'pending' && (
                    <div className="mt-4 space-y-3">
                      {rejectingId === log.id && (
                        <textarea
                          rows={3}
                          value={reason}
                          onChange={event => setReason(event.target.value)}
                          className="w-full resize-none rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                          placeholder="반려 사유를 입력하세요."
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => onApprove(log.id)}
                          className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          승인
                        </button>
                        {rejectingId === log.id ? (
                          <button
                            type="button"
                            disabled={submitting || !reason.trim()}
                            onClick={() => {
                              onReject({ logId: log.id, workerId: log.userId, reason })
                              setRejectingId(null)
                              setReason('')
                            }}
                            className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            반려 확정
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(log.id)
                              setReason('')
                            }}
                            className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            반려
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
