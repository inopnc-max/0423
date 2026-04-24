'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Cloud,
  CloudOff,
  RotateCcw,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useSync } from '@/contexts/sync-context'
import { createClient } from '@/lib/supabase/client'
import { isPartner } from '@/lib/roles'
import { ROUTES } from '@/lib/routes'
import { loadUserUiState } from '@/lib/user-ui-state'
import { SiteStatusBadge } from '@/components/common/SiteStatusBadge'
import { PageLoading } from '@/components/common/PageLoading'

interface Site {
  id: string
  name: string
  company: string
  status: string
}

interface RecentWorkContext {
  siteId: string
  siteName: string
  workDate: string | null
}

const QUICK_ACTIONS = [
  {
    href: ROUTES.worklog,
    label: '일지 작성',
    icon: ClipboardList,
    colorClass: 'bg-blue-50 text-blue-600',
  },
  {
    href: ROUTES.output,
    label: '출역 확인',
    icon: CalendarDays,
    colorClass: 'bg-emerald-50 text-emerald-600',
  },
  {
    href: ROUTES.site,
    label: '현장 보기',
    icon: Building2,
    colorClass: 'bg-orange-50 text-orange-600',
  },
]

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const { isOnline, queueCount, syncing, lastSyncedAt } = useSync()
  const supabase = useMemo(() => createClient(), [])

  const [sites, setSites] = useState<Site[]>([])
  const [recentWork, setRecentWork] = useState<RecentWorkContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHomeData() {
      if (!user) return

      try {
        const [sitesResponse, uiState] = await Promise.all([
          supabase.from('sites').select('id, name, company, status').order('name'),
          loadUserUiState(supabase, user.userId),
        ])

        const nextSites = sitesResponse.data || []
        setSites(nextSites)

        if (uiState?.last_site_id) {
          const matchedSite = nextSites.find(site => site.id === uiState.last_site_id)
          setRecentWork({
            siteId: uiState.last_site_id,
            siteName: matchedSite?.name || '최근 작업 현장',
            workDate: uiState.last_work_date,
          })
        } else {
          setRecentWork(null)
        }
      } catch (error) {
        console.error('Failed to fetch home data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      void fetchHomeData()
    }
  }, [authLoading, supabase, user])

  if (authLoading || loading) {
    return <PageLoading />
  }

  const isPartnerUser = isPartner(user?.role || '')
  const SyncIcon = !isOnline ? CloudOff : syncing ? RefreshCw : Cloud
  const syncLabel = !isOnline
    ? '오프라인 상태'
    : syncing
      ? '동기화 진행 중'
      : queueCount > 0
        ? `동기화 대기 ${queueCount}건`
        : '온라인 상태'
  const syncDescription = !isOnline
    ? '저장된 작업은 기기에 보관되고, 네트워크 복귀 후 자동 반영됩니다.'
    : queueCount > 0
      ? '대기 중인 작업이 있어 온라인에서 자동으로 다시 전송됩니다.'
      : lastSyncedAt
        ? `마지막 동기화 ${new Date(lastSyncedAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}`
        : '현재 작업 데이터가 서버와 연결된 상태입니다.'

  return (
    <div className="space-y-6 p-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-sm text-[var(--color-text-secondary)]">오늘의 작업 시작</div>
        <h1 className="mt-1 text-xl font-bold text-[var(--color-navy)]">
          {user?.profile?.name || '사용자'}님, 반갑습니다.
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          마지막 현장 상태와 바로 가기 메뉴를 한 번에 확인할 수 있습니다.
        </p>
      </section>

      {!isPartnerUser && recentWork && (
        <section className="rounded-2xl bg-gradient-to-r from-[var(--color-accent-light)] to-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
                <RotateCcw className="h-4 w-4" strokeWidth={1.9} />
                <span>최근 작업 복원</span>
              </div>
              <div className="mt-2 text-lg font-semibold text-[var(--color-navy)]">
                {recentWork.siteName}
              </div>
              <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {recentWork.workDate
                  ? `${recentWork.workDate} 작업일지로 이어서 이동`
                  : '최근 작업 현장으로 이어서 이동'}
              </div>
            </div>

            <Link
              href={`${ROUTES.worklog}?site=${recentWork.siteId}${
                recentWork.workDate ? `&date=${recentWork.workDate}` : ''
              }`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-navy)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)]"
            >
              <span>이어쓰기</span>
              <ChevronRight className="h-4 w-4" strokeWidth={1.9} />
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-[var(--color-text-secondary)]">동기화 상태</div>
            <div className="mt-1 text-lg font-semibold text-[var(--color-navy)]">
              {syncLabel}
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {syncDescription}
            </p>
          </div>

          <div className="rounded-full bg-[var(--color-accent-light)] p-3 text-[var(--color-accent)]">
            <SyncIcon
              className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`}
              strokeWidth={1.9}
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.filter(item => !isPartnerUser || item.href !== ROUTES.worklog).map(
          ({ href, label, icon: Icon, colorClass }) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full ${colorClass}`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </div>
              <div className="text-sm font-semibold text-[var(--color-text)]">{label}</div>
            </Link>
          )
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">현장 목록</h2>
          <Link href={ROUTES.site} className="text-sm font-medium text-[var(--color-accent)]">
            전체 보기
          </Link>
        </div>

        {sites.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-[var(--color-text-secondary)] shadow-sm">
            접근 가능한 현장이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {sites.slice(0, 5).map(site => (
              <Link
                key={site.id}
                href={`${ROUTES.site}/${site.id}`}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[var(--color-text)]">{site.name}</div>
                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{site.company}</div>
                </div>

                <div className="ml-4 flex items-center gap-3">
                  <SiteStatusBadge status={site.status} />
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {!isPartnerUser && (
        <section>
          <Link
            href={ROUTES.output}
            className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[var(--color-navy)] to-[var(--color-navy-light)] p-5 text-white shadow-sm"
          >
            <div>
              <div className="text-sm text-white/70">이번 달 요약</div>
              <div className="mt-1 text-lg font-semibold">출역/급여 현황 보기</div>
            </div>
            <ChevronRight className="h-5 w-5" strokeWidth={1.9} />
          </Link>
        </section>
      )}
    </div>
  )
}
