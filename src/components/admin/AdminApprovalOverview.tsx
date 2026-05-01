import Link from 'next/link'
import { ClipboardCheck, FileCheck2 } from 'lucide-react'
import type { AdminApprovalQueueItem, AdminDashboardSummary } from '@/lib/admin/adminDashboardRecords'

const TYPE_LABELS: Record<AdminApprovalQueueItem['type'], string> = {
  worklog: '작업일지',
  photo_sheet: '사진대지',
}

const TYPE_ICONS: Record<AdminApprovalQueueItem['type'], typeof ClipboardCheck> = {
  worklog: ClipboardCheck,
  photo_sheet: FileCheck2,
}

export function AdminApprovalOverview({
  summary,
  queue,
}: {
  summary: AdminDashboardSummary
  queue: AdminApprovalQueueItem[]
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">승인 업무</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            일지와 사진대지 승인 대상을 한 곳에서 확인합니다.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">일지 {summary.pendingLogs}</span>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700">사진대지 {summary.pendingPhotoSheets}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {queue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
            승인 대기 항목이 없습니다.
          </div>
        ) : (
          queue.map(item => {
            const Icon = TYPE_ICONS[item.type]
            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 transition hover:border-[var(--color-accent)] hover:bg-[var(--color-bg)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg)] text-[var(--color-navy)]">
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{item.title}</span>
                  <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">{item.subtitle}</span>
                </span>
                <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700">
                  {TYPE_LABELS[item.type]}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </section>
  )
}
