'use client'

import Link from 'next/link'
import { Bell, Boxes, ClipboardCheck, Map, Upload, Users, Wallet } from 'lucide-react'
import { AdminApprovalOverview } from '@/components/admin/AdminApprovalOverview'
import { AdminDocumentControlPanel } from '@/components/admin/AdminDocumentControlPanel'
import { AdminSummaryCards } from '@/components/admin/AdminSummaryCards'
import { AdminUserRoleOverview } from '@/components/admin/AdminUserRoleOverview'
import { useAdminDashboard } from '@/hooks/admin/useAdminDashboard'
import { ADMIN_ROUTES } from '@/lib/routes'

const QUICK_ACTIONS = [
  { href: ADMIN_ROUTES.users, label: '사용자/권한', icon: Users, colorClass: 'bg-blue-50 text-blue-600' },
  { href: ADMIN_ROUTES.sites, label: '회사/현장', icon: Map, colorClass: 'bg-green-50 text-green-600' },
  { href: ADMIN_ROUTES.worklogs, label: '일지 승인', icon: ClipboardCheck, colorClass: 'bg-orange-50 text-orange-600' },
  { href: ADMIN_ROUTES.payroll, label: '출역/급여', icon: Wallet, colorClass: 'bg-violet-50 text-violet-600' },
  { href: ADMIN_ROUTES.notifications, label: '알림 발송', icon: Bell, colorClass: 'bg-cyan-50 text-cyan-700' },
  { href: ADMIN_ROUTES.csvUpload, label: 'CSV 업로드', icon: Upload, colorClass: 'bg-slate-100 text-slate-700' },
]

export default function AdminDashboardPage() {
  const { records, loading, error } = useAdminDashboard()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-navy)]">관리자 대시보드</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          사용자, 현장, 승인, 문서 통제 상태를 한 화면에서 확인합니다.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-sm">
          <div className="text-[var(--color-text-secondary)]">관리자 정보를 불러오는 중입니다.</div>
        </div>
      ) : error || !records ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error ?? '관리자 대시보드 정보를 표시할 수 없습니다.'}
        </div>
      ) : (
        <>
          <AdminSummaryCards summary={records.summary} />

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <AdminApprovalOverview summary={records.summary} queue={records.approvalQueue} />
            <AdminUserRoleOverview roles={records.roleCounts} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <AdminDocumentControlPanel summary={records.summary} />

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--color-navy)]">빠른 작업</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {QUICK_ACTIONS.map(({ href, label, icon: Icon, colorClass }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] p-4 transition hover:bg-[var(--color-bg)]"
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full ${colorClass}`}>
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-text)]">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-navy)]">역할별 회귀 방지 메모</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Admin 대시보드는 관리자 콘솔 내부만 보강하며 worker, site_manager, partner, production_manager 화면 구조를 변경하지 않습니다.
                </p>
              </div>
              <Boxes className="h-6 w-6 text-[var(--color-accent)]" strokeWidth={1.9} />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
