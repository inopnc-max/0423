'use client'

import { CalendarDays, ClipboardList, FileText, ImageIcon, Loader2 } from 'lucide-react'
import {
  countDailyLogMedia,
  summarizeDailyLogTasks,
  type ApprovedDailyLogRow,
} from '@/lib/site/siteRecords'

export function DailyLogPreview({ log }: { log: ApprovedDailyLogRow }) {
  const media = countDailyLogMedia(log.media_info)

  return (
    <div className="space-y-4 p-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-sm text-[var(--color-text-secondary)]">작업일</div>
        <div className="mt-1 text-xl font-bold text-[var(--color-navy)]">{log.work_date ?? '-'}</div>
        <div className="mt-3 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 w-fit">
          {log.status ?? 'approved'}
        </div>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-[var(--color-navy)]">작업내용</h3>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{summarizeDailyLogTasks(log.task_tags)}</p>
      </section>
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs text-[var(--color-text-tertiary)]">사진</div>
          <div className="mt-1 text-lg font-bold text-[var(--color-text)]">{media.photos}건</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs text-[var(--color-text-tertiary)]">문서/도면</div>
          <div className="mt-1 text-lg font-bold text-[var(--color-text)]">{media.documents}건</div>
        </div>
      </section>
    </div>
  )
}

export function ApprovedDailyLogList({
  logs,
  loading,
  onPreview,
}: {
  logs: ApprovedDailyLogRow[]
  loading: boolean
  onPreview: (log: ApprovedDailyLogRow) => void
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-navy)]">승인완료 일지</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">approved, locked, final 상태만 표시합니다.</p>
        </div>
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">{logs.length}건</span>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-sm text-[var(--color-text-secondary)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.9} />
          일지를 불러오는 중입니다.
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
          승인완료 일지가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => {
            const media = countDailyLogMedia(log.media_info)
            return (
              <button
                key={log.id}
                type="button"
                onClick={() => onPreview(log)}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-white p-4 text-left transition hover:border-[var(--color-accent)] hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                    <ClipboardList className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                      <CalendarDays className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
                      {log.work_date ?? '-'}
                    </span>
                    <span className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                      {summarizeDailyLogTasks(log.task_tags)}
                    </span>
                    <span className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        <ImageIcon className="h-3 w-3" strokeWidth={1.9} />
                        사진 {media.photos}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        <FileText className="h-3 w-3" strokeWidth={1.9} />
                        문서 {media.documents}
                      </span>
                      {log.approved_at && (
                        <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                          승인 {new Date(log.approved_at).toLocaleDateString('ko-KR')}
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
