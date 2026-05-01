import Link from 'next/link'
import { FileCheck2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/routes'
import type { AdminDashboardSummary } from '@/lib/admin/adminDashboardRecords'

export function AdminDocumentControlPanel({
  summary,
}: {
  summary: AdminDashboardSummary
}) {
  const items = [
    {
      label: '사진대지 승인 대기',
      value: summary.pendingPhotoSheets,
      icon: FileCheck2,
      className: 'bg-cyan-50 text-cyan-700',
    },
    {
      label: '잠금 사진대지',
      value: summary.lockedPhotoSheets,
      icon: LockKeyhole,
      className: 'bg-slate-100 text-slate-700',
    },
    {
      label: '승인 완료 문서',
      value: summary.approvedDocuments,
      icon: ShieldCheck,
      className: 'bg-green-50 text-green-700',
    },
  ]

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">문서 통제</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            승인/잠금 문서 흐름과 Partner 공개 기준을 확인합니다.
          </p>
        </div>
        <Link href={ADMIN_ROUTES.documents} className="text-sm font-semibold text-[var(--color-accent)]">
          문서 관리
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {items.map(({ label, value, icon: Icon, className }) => (
          <div key={label} className="rounded-xl border border-[var(--color-border)] p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${className}`}>
              <Icon className="h-4 w-4" strokeWidth={1.9} />
            </div>
            <div className="text-xl font-bold text-[var(--color-text)]">{value}</div>
            <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
        사진대지는 승인 시 잠금 처리되고, Partner에는 승인완료 또는 잠금 문서만 노출됩니다.
      </div>
    </section>
  )
}
