'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, ClipboardCheck, Map, Upload, Users, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_ROUTES } from '@/lib/routes'
import { PageLoading } from '@/components/common/PageLoading'

interface DashboardStats {
  totalUsers: number
  totalSites: number
  pendingLogs: number
  draftLogs: number
}

const QUICK_ACTIONS = [
  { href: ADMIN_ROUTES.users, label: '사용자/권한', icon: Users, colorClass: 'bg-blue-50 text-blue-600' },
  { href: ADMIN_ROUTES.sites, label: '회사/현장', icon: Map, colorClass: 'bg-green-50 text-green-600' },
  { href: ADMIN_ROUTES.worklogs, label: '일지 승인', icon: ClipboardCheck, colorClass: 'bg-orange-50 text-orange-600' },
  { href: ADMIN_ROUTES.payroll, label: '출역/급여', icon: Wallet, colorClass: 'bg-violet-50 text-violet-600' },
  { href: ADMIN_ROUTES.notifications, label: '알림 발송', icon: Bell, colorClass: 'bg-cyan-50 text-cyan-700' },
  { href: ADMIN_ROUTES.csvUpload, label: 'CSV 업로드', icon: Upload, colorClass: 'bg-slate-100 text-slate-700' },
]

export default function AdminDashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalSites: 0,
    pendingLogs: 0,
    draftLogs: 0,
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersResponse, sitesResponse, pendingLogsResponse, draftLogsResponse] = await Promise.all([
          supabase.from('workers').select('id', { count: 'exact', head: true }),
          supabase.from('sites').select('id', { count: 'exact', head: true }),
          supabase.from('daily_logs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('daily_logs').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        ])

        setStats({
          totalUsers: usersResponse.count || 0,
          totalSites: sitesResponse.count || 0,
          pendingLogs: pendingLogsResponse.count || 0,
          draftLogs: draftLogsResponse.count || 0,
        })
      } catch (error) {
        console.error('Failed to fetch admin stats:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchStats()
  }, [supabase])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-navy)]">관리자 대시보드</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          사용자, 현장, 승인, 자재, 출역 데이터를 한 곳에서 관리할 수 있습니다.
        </p>
      </div>

      {loading ? (
        <PageLoading />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Link href={ADMIN_ROUTES.users} className="stat-card">
              <div className="stat-card__value">{stats.totalUsers}</div>
              <div className="stat-card__label">전체 사용자</div>
            </Link>
            <Link href={ADMIN_ROUTES.sites} className="stat-card">
              <div className="stat-card__value">{stats.totalSites}</div>
              <div className="stat-card__label">전체 현장</div>
            </Link>
            <Link href={ADMIN_ROUTES.worklogs} className="stat-card">
              <div className="stat-card__value">{stats.pendingLogs}</div>
              <div className="stat-card__label">승인 대기</div>
            </Link>
            <Link href={ADMIN_ROUTES.worklogs} className="stat-card">
              <div className="stat-card__value">{stats.draftLogs}</div>
              <div className="stat-card__label">임시 저장</div>
            </Link>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--color-navy)]">빠른 작업</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
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
          </section>
        </>
      )}
    </div>
  )
}
