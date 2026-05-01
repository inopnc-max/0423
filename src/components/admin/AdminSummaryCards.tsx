import Link from 'next/link'
import { ClipboardCheck, FileCheck2, FileText, Map, Users } from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/routes'
import type { AdminDashboardSummary } from '@/lib/admin/adminDashboardRecords'

interface SummaryCard {
  label: string
  value: number
  href: string
  icon: typeof Users
  tone: string
}

export function AdminSummaryCards({
  summary,
}: {
  summary: AdminDashboardSummary
}) {
  const cards: SummaryCard[] = [
    {
      label: '전체 사용자',
      value: summary.totalUsers,
      href: ADMIN_ROUTES.users,
      icon: Users,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: '전체 현장',
      value: summary.totalSites,
      href: ADMIN_ROUTES.sites,
      icon: Map,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: '일지 승인 대기',
      value: summary.pendingLogs,
      href: ADMIN_ROUTES.worklogs,
      icon: ClipboardCheck,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: '사진대지 승인 대기',
      value: summary.pendingPhotoSheets,
      href: ADMIN_ROUTES.documents,
      icon: FileCheck2,
      tone: 'bg-cyan-50 text-cyan-700',
    },
    {
      label: '승인 문서',
      value: summary.approvedDocuments,
      href: ADMIN_ROUTES.documents,
      icon: FileText,
      tone: 'bg-violet-50 text-violet-700',
    },
  ]

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, href, icon: Icon, tone }) => (
        <Link
          key={label}
          href={href}
          className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
            <Icon className="h-5 w-5" strokeWidth={1.9} />
          </div>
          <div className="text-2xl font-bold text-[var(--color-navy)]">{value}</div>
          <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{label}</div>
        </Link>
      ))}
    </section>
  )
}
