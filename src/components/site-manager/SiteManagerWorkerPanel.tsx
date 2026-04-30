'use client'

import { AlertCircle, CheckCircle2, Clock, FileWarning, Users } from 'lucide-react'
import type { SiteManagerWorker } from '@/lib/site-manager/siteManagerRecords'

const STATUS_LABELS: Record<SiteManagerWorker['todayStatus'], string> = {
  draft: '임시저장',
  pending: '승인대기',
  approved: '승인완료',
  rejected: '반려',
  missing: '미작성',
}

const STATUS_CLASSES: Record<SiteManagerWorker['todayStatus'], string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  missing: 'bg-slate-100 text-slate-500',
}

export function WorkerStatusSummary({
  workers,
  loading,
}: {
  workers: SiteManagerWorker[]
  loading: boolean
}) {
  const attended = workers.filter(worker => worker.todayStatus !== 'missing').length
  const missing = workers.length - attended
  const rejected = workers.filter(worker => worker.todayStatus === 'rejected' || worker.hasRejectedLog).length
  const pending = workers.filter(worker => worker.todayStatus === 'pending').length

  const items = [
    { label: '담당 작업자', value: workers.length, icon: Users, className: 'bg-blue-50 text-blue-700' },
    { label: '오늘 출역자', value: attended, icon: CheckCircle2, className: 'bg-green-50 text-green-700' },
    { label: '미작성자', value: missing, icon: Clock, className: 'bg-slate-100 text-slate-700' },
    { label: '반려 보유', value: rejected, icon: AlertCircle, className: 'bg-red-50 text-red-700' },
    { label: '승인대기', value: pending, icon: FileWarning, className: 'bg-amber-50 text-amber-700' },
  ]

  return (
    <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
      {items.map(({ label, value, icon: Icon, className }) => (
        <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full ${className}`}>
            <Icon className="h-4 w-4" strokeWidth={1.9} />
          </div>
          <div className="text-2xl font-bold text-[var(--color-navy)]">{loading ? '-' : value}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">{label}</div>
        </div>
      ))}
    </section>
  )
}

export function WorkerList({
  workers,
  loading,
}: {
  workers: SiteManagerWorker[]
  loading: boolean
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[var(--color-navy)]">담당 작업자 상태</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">선택 현장 기준 오늘 출역과 일지 상태를 확인합니다.</p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">작업자 상태를 불러오는 중입니다.</div>
      ) : workers.length === 0 ? (
        <div className="rounded-xl bg-[var(--color-bg)] px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
          표시할 담당 작업자가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {workers.map(worker => (
            <div key={worker.id} className="rounded-xl border border-[var(--color-border)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[var(--color-text)]">{worker.name}</div>
                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {worker.company || '-'} · {worker.phone || worker.email}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                    오늘 공수 {worker.todayManDay}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[worker.todayStatus]}`}>
                  {STATUS_LABELS[worker.todayStatus]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
