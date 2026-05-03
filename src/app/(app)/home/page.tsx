'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Cloud,
  CloudOff,
  MapPin,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useSync } from '@/contexts/sync-context'
import { useMenuSearch } from '@/hooks/useMenuSearch'
import { useSelectedSite } from '@/contexts/selected-site-context'
import { isPartner } from '@/lib/roles'
import { ROUTES } from '@/lib/routes'
import { SiteStatusBadge } from '@/components/common/SiteStatusBadge'
import { CommonHomeDateRail } from '@/components/home/CommonHomeDateRail'
import { RecentViewedDocuments } from '@/components/home/RecentViewedDocuments'
import { PartnerReadonlyPortal } from '@/components/partner/PartnerReadonlyPortal'
import { SiteCombobox as SharedSiteCombobox } from '@/components/site/SiteCombobox'
import { SiteManagerHomeSummary } from '@/components/site-manager/SiteManagerAttendancePanel'
import { useSiteManagerDashboard } from '@/hooks/site-manager/useSiteManagerDashboard'
import { getSelectedWorkDate, setSelectedWorkDate } from '@/lib/ui-state'
import type { SiteSummary } from '@/contexts/selected-site-context'

function SiteCombobox({
  sites,
  selectedId,
  onSelect,
}: {
  sites: SiteSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const { query, setQuery, filteredSites } = useMenuSearch({ scope: 'site_select' })
  const [open, setOpen] = useState(false)

  const selected = sites.find(s => s.id === selectedId)

  useEffect(() => {
    if (!open) setQuery('')
  }, [open, setQuery])

  if (sites.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--color-accent-light)] p-4 text-center text-sm text-[var(--color-text-secondary)]">
        접근 가능한 현장이 없습니다.
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-[var(--color-border)] bg-white px-4 py-3 text-left transition hover:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      >
        <Search className="h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
        {selected ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-[var(--color-text)]">{selected.name}</span>
            <span className="block truncate text-sm text-[var(--color-text-secondary)]">
              {selected.company}
              {selected.affiliation ? ` · ${selected.affiliation}` : ''}
            </span>
          </span>
        ) : (
          <span className="flex-1 text-[var(--color-text-tertiary)]">현장 검색...</span>
        )}
        <ChevronRight
          className={`h-5 w-5 shrink-0 text-[var(--color-text-tertiary)] transition-transform ${open ? 'rotate-90' : ''}`}
          strokeWidth={1.9}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-hidden rounded-2xl border-2 border-[var(--color-border)] bg-white shadow-lg">
          <div className="sticky top-0 bg-white p-2">
            <div className="flex items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
              <input
                autoFocus
                type="text"
                placeholder="현장명, 원청사, 소속, 주소 검색..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)]"
                >
                  <X className="h-4 w-4" strokeWidth={1.9} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredSites.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredSites.map(site => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    onSelect(site.id)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-accent-light)]"
                >
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-[var(--color-text)]">{site.name}</span>
                      <SiteStatusBadge status={site.status} />
                    </div>
                    <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {site.company}
                      {site.affiliation ? ` · ${site.affiliation}` : ''}
                    </div>
                    {site.address && (
                      <div className="mt-1 flex items-start gap-1 text-xs text-[var(--color-text-tertiary)]">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.9} />
                        <span className="line-clamp-1">{site.address}</span>
                      </div>
                    )}
                  </div>
                  {site.id === selectedId && (
                    <span className="shrink-0 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs font-semibold text-white">
                      선택됨
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setOpen(false)
            setQuery('')
          }}
        />
      )}
    </div>
  )
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const { isOnline, queueCount, syncing } = useSync()
  const {
    selectedSiteId,
    selectedSite,
    accessibleSites,
    loading: siteLoading,
    error,
    setSelectedSiteId,
    refreshSelectedSite,
  } = useSelectedSite()

  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedWorkDate, setSelectedWorkDateState] = useState<string>(today)

  useEffect(() => {
    const saved = getSelectedWorkDate()
    if (saved) {
      setSelectedWorkDateState(saved)
    } else {
      setSelectedWorkDateState(today)
    }
  }, [today])

  const handleDateSelect = (date: string) => {
    setSelectedWorkDateState(date)
    setSelectedWorkDate(date)
  }

  const isPartnerUser = isPartner(user?.role ?? '')
  const isSiteManagerUser = user?.role === 'site_manager'
  const loading = authLoading || siteLoading
  const siteManagerDashboard = useSiteManagerDashboard({
    managerId: isSiteManagerUser ? user?.userId : null,
    managerName: user?.profile?.name,
    siteId: isSiteManagerUser ? selectedSiteId : null,
    siteName: selectedSite?.name,
    workDate: selectedWorkDate,
  })

  const QUICK_ACTIONS = [
    {
      href: `${ROUTES.worklog}${selectedSiteId ? `?site=${selectedSiteId}&date=${selectedWorkDate}` : `?date=${selectedWorkDate}`}`,
      label: '일지 작성',
      icon: ClipboardList,
      colorClass: 'bg-blue-50 text-blue-600',
      show: !isPartnerUser,
    },
    {
      href: `${ROUTES.output}?date=${selectedWorkDate}`,
      label: '출역 확인',
      icon: CalendarDays,
      colorClass: 'bg-emerald-50 text-emerald-600',
      show: true,
    },
    {
      href: ROUTES.site,
      label: '현장 보기',
      icon: Building2,
      colorClass: 'bg-orange-50 text-orange-600',
      show: true,
    },
  ]

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">로딩 중...</div>
      </div>
    )
  }

  if (isPartnerUser) {
    return (
      <PartnerReadonlyPortal
        userName={user?.profile?.name}
        userId={user?.userId}
        sites={accessibleSites}
        selectedSite={selectedSite}
        selectedSiteId={selectedSiteId}
        error={error}
        onSelectSite={id => {
          void setSelectedSiteId(id)
        }}
      />
    )
  }

  const SyncIcon = !isOnline ? CloudOff : syncing ? RefreshCw : Cloud
  const syncLabel = !isOnline
    ? '오프라인 상태'
    : syncing
      ? '동기화 진행 중'
      : queueCount > 0
        ? `동기화 대기 ${queueCount}건`
        : '온라인 상태'

  return (
    <div className="space-y-5 p-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-[var(--color-navy)]">
              {user?.profile?.name || '사용자'}님, 오늘의 작업
            </h1>
          </div>

          <div
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              !isOnline
                ? 'bg-red-50 text-red-600'
                : syncing
                  ? 'bg-blue-50 text-blue-600'
                  : queueCount > 0
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-green-50 text-green-600'
            }`}
          >
            <SyncIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.9} />
            <span>{syncLabel}</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <CommonHomeDateRail
        selectedDate={selectedWorkDate}
        onDateSelect={handleDateSelect}
      />

      {isSiteManagerUser && (
        <SiteManagerHomeSummary
          summary={siteManagerDashboard.summary}
          loading={siteManagerDashboard.loading}
        />
      )}

      <section className="space-y-3">
        <div className="text-sm font-semibold text-[var(--color-navy)]">현장 선택</div>
        <SharedSiteCombobox
          sites={accessibleSites}
          selectedId={selectedSiteId}
          onSelect={id => {
            void setSelectedSiteId(id)
          }}
          label=""
        />
      </section>

      {selectedSite && (
        <section className="rounded-2xl bg-gradient-to-r from-[var(--color-accent-light)] to-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 shrink-0 text-[var(--color-accent)]" strokeWidth={1.9} />
                <span className="font-bold text-[var(--color-navy)]">{selectedSite.name}</span>
                <SiteStatusBadge status={selectedSite.status} />
              </div>
              {selectedSite.company && (
                <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  원청사: {selectedSite.company}
                </div>
              )}
              {selectedSite.affiliation && (
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  소속: {selectedSite.affiliation}
                </div>
              )}
              {selectedSite.address && (
                <div className="mt-1 flex items-start gap-1 text-sm text-[var(--color-text-secondary)]">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                  <span className="line-clamp-1">{selectedSite.address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href={ROUTES.site}
              className="flex-1 rounded-full border-2 border-[var(--color-accent)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--color-accent)] transition hover:bg-[var(--color-accent-light)]"
            >
              현장 보기
            </Link>
            {!isPartnerUser && selectedSiteId && (
              <Link
                href={`${ROUTES.worklog}?site=${selectedSiteId}&date=${selectedWorkDate}`}
                className="flex-1 rounded-full bg-[var(--color-navy)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)]"
              >
                일지 작성
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.filter(item => item.show).map(
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

        {accessibleSites.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-[var(--color-text-secondary)] shadow-sm">
            접근 가능한 현장이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {accessibleSites.slice(0, 5).map(site => (
              <button
                key={site.id}
                type="button"
                onClick={() => {
                  void setSelectedSiteId(site.id)
                }}
                className={`flex w-full items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md ${
                  site.id === selectedSiteId ? 'ring-2 ring-[var(--color-accent)]' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-[var(--color-text)]">{site.name}</span>
                    {site.id === selectedSiteId && (
                      <span className="shrink-0 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs font-semibold text-white">
                        선택됨
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{site.company}</div>
                </div>

                <div className="ml-4 flex items-center gap-3">
                  <SiteStatusBadge status={site.status} />
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {!isPartnerUser && (
        <section>
          <Link
            href={`${ROUTES.output}?date=${selectedWorkDate}`}
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

      <RecentViewedDocuments
        userId={user?.userId}
        siteId={selectedSiteId}
        partnerMode={isPartnerUser}
        limit={3}
      />
    </div>
  )
}
