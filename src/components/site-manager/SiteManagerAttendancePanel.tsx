'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock, Users } from 'lucide-react'
import type { SiteManagerLog, SiteManagerSummary, SiteManagerWorker } from '@/lib/site-manager/siteManagerRecords'

const STATUS_LABELS = {
  draft: '임시저장',
  pending: '승인대기',
  approved: '승인완료',
  rejected: '반려',
  missing: '미작성',
} as const

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  missing: 'bg-slate-100 text-slate-500',
}

export function SiteManagerAttendancePanel({
  workDate,
  siteName,
  logs,
  workers,
  summary,
  loading,
  submitting,
  message,
  onSaveAttendance,
}: {
  workDate: string
  siteName?: string | null
  logs: SiteManagerLog[]
  workers: SiteManagerWorker[]
  summary: SiteManagerSummary
  loading: boolean
  submitting: boolean
  message?: { type: 'success' | 'error'; text: string } | null
  onSaveAttendance: (input: { manDay: number; memo?: string }) => void
}) {
  const [tab, setTab] = useState<'mine' | 'team'>('mine')
  const [manDay, setManDay] = useState('1')
  const [memo, setMemo] = useState('')

  const todayLogs = useMemo(
    () => logs.filter(log => log.workDate === workDate),
    [logs, workDate]
  )

  const missingWorkers = workers.filter(worker => worker.todayStatus === 'missing')

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)]">
            <CalendarDays className="h-4 w-4" strokeWidth={1.9} />
            현장관리자 출역
          </div>
          <h2 className="mt-1 text-lg font-bold text-[var(--color-navy)]">{siteName || '선택 현장'}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{workDate} 기준 내 출역과 팀 출역을 확인합니다.</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[var(--color-bg)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--color-navy)]">{summary.todayWorkers}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">투입인원</div>
        </div>
        <div className="rounded-xl bg-[var(--color-bg)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--color-accent)]">{summary.todayManDay}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">총 공수</div>
        </div>
        <div className="rounded-xl bg-[var(--color-bg)] p-3 text-center">
          <div className="text-lg font-bold text-amber-600">{summary.pending}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">승인대기</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-bg)] p-1">
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === 'mine' ? 'bg-white text-[var(--color-navy)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          내 출역
        </button>
        <button
          type="button"
          onClick={() => setTab('team')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === 'team' ? 'bg-white text-[var(--color-navy)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          팀 출역
        </button>
      </div>

      {message && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {tab === 'mine' ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[var(--color-text)]">내 공수</span>
            <input
              type="number"
              min="0"
              max="3.5"
              step="0.5"
              value={manDay}
              onChange={event => setManDay(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[var(--color-text)]">메모</span>
            <textarea
              rows={3}
              value={memo}
              onChange={event => setMemo(event.target.value)}
              className="w-full resize-none rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
              placeholder="현장 확인, 지원 업무 등"
            />
          </label>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onSaveAttendance({ manDay: Number(manDay), memo })}
            className="w-full rounded-xl bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)] disabled:opacity-50"
          >
            {submitting ? '저장 중...' : '내 출역 저장'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">팀 출역을 불러오는 중입니다.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50 p-3">
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <Users className="h-3.5 w-3.5" strokeWidth={1.9} />
                    담당 작업자
                  </div>
                  <div className="mt-1 text-lg font-bold text-blue-700">{workers.length}명</div>
                </div>
                <div className="rounded-xl bg-red-50 p-3">
                  <div className="flex items-center gap-2 text-xs text-red-700">
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.9} />
                    출역 누락
                  </div>
                  <div className="mt-1 text-lg font-bold text-red-700">{missingWorkers.length}명</div>
                </div>
              </div>

              <div className="space-y-2">
                {todayLogs.length === 0 ? (
                  <div className="rounded-xl bg-[var(--color-bg)] px-4 py-5 text-center text-sm text-[var(--color-text-secondary)]">
                    선택 날짜의 팀 출역 기록이 없습니다.
                  </div>
                ) : (
                  todayLogs.map(log => (
                    <div key={log.id} className="rounded-xl border border-[var(--color-border)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-[var(--color-text)]">{log.workerName}</div>
                          <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                            {log.workerCount}명 · {log.totalManDay}공수
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[log.status]}`}>
                          {STATUS_LABELS[log.status]}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

export function SiteManagerHomeSummary({
  summary,
  loading,
}: {
  summary: SiteManagerSummary
  loading: boolean
}) {
  const items = [
    { label: '오늘 투입', value: summary.todayWorkers, suffix: '명', icon: Users, className: 'text-blue-700 bg-blue-50' },
    { label: '오늘 공수', value: summary.todayManDay, suffix: '', icon: CheckCircle2, className: 'text-green-700 bg-green-50' },
    { label: '승인대기', value: summary.pending, suffix: '건', icon: Clock, className: 'text-amber-700 bg-amber-50' },
  ]

  return (
    <section className="grid grid-cols-3 gap-3">
      {items.map(({ label, value, suffix, icon: Icon, className }) => (
        <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full ${className}`}>
            <Icon className="h-4 w-4" strokeWidth={1.9} />
          </div>
          <div className="text-lg font-bold text-[var(--color-navy)]">
            {loading ? '-' : `${value}${suffix}`}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)]">{label}</div>
        </div>
      ))}
    </section>
  )
}
