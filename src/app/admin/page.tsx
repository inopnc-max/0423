'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Boxes, ClipboardCheck, Map, Upload, Users, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_ROUTES } from '@/lib/routes'

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
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-sm">
          <div className="text-[var(--color-text-secondary)]">로딩 중...</div>
        </div>
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

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
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
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--color-navy)]">운영 메모</h2>
              <div className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                <div className="rounded-xl bg-[var(--color-bg)] px-4 py-3">
                  CSV 대량 작업은 업로드 로그와 함께 운영하는 방향으로 정리했습니다.
                </div>
                <div className="rounded-xl bg-[var(--color-bg)] px-4 py-3">
                  일지 승인, 출역/급여, 감사로그는 공식 메뉴 구조에 맞춰 진입점을 열어두었습니다.
                </div>
                <div className="rounded-xl bg-[var(--color-bg)] px-4 py-3">
                  실제 데이터 운영은 Supabase 스키마 캐시와 마이그레이션 반영이 선행되어야 합니다.
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-navy)]">확장 준비 상태</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  v10 기준으로 관리자 메뉴 구조를 먼저 고정하고, 세부 기능은 각 라우트에서 이어서 확장할 수 있게 정리했습니다.
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
