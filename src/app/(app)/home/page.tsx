'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { endOfMonth, format, isValid, parseISO, startOfMonth } from 'date-fns'
import {
  Building2,
  Cloud,
  CloudOff,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useSync } from '@/contexts/sync-context'
import { useSelectedSite } from '@/contexts/selected-site-context'
import { isPartner } from '@/lib/roles'
import { ROUTES } from '@/lib/routes'
import { createClient } from '@/lib/supabase/client'
import { CommonHomeDateRail } from '@/components/home/CommonHomeDateRail'
import { RecentViewedDocuments } from '@/components/home/RecentViewedDocuments'
import { PartnerReadonlyPortal } from '@/components/partner/PartnerReadonlyPortal'
import { SiteCombobox } from '@/components/site/SiteCombobox'
import { SiteManagerHomeSummary } from '@/components/site-manager/SiteManagerAttendancePanel'
import { useSiteManagerDashboard } from '@/hooks/site-manager/useSiteManagerDashboard'
import { getSelectedWorkDate, setSelectedWorkDate } from '@/lib/ui-state'
import { getSiteStatusConfig } from '@/lib/site-status'

type HomeSiteSummary = {
  attendanceCount: number | null
  worklogStatus: string | null
  missingRequiredDocuments: number | null
}

type DailyLogSummaryRow = {
  id: string
  status: string | null
  work_date: string
}

type RequiredDocumentRow = {
  status?: string | null
}

const WORKLOG_STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  pending: '승인대기',
  approved: '승인완료',
  rejected: '반려',
  locked: '잠금',
  final: '완료',
}

function getWorklogStatusLabel(status: string | null) {
  if (!status) return '일지 없음'
  return WORKLOG_STATUS_LABELS[status] ?? status
}

function getWorklogStatusClass(status: string | null) {
  if (status === 'approved' || status === 'locked' || status === 'final') return 'bg-green-50 text-green-700'
  if (status === 'pending') return 'bg-amber-50 text-amber-700'
  if (status === 'rejected') return 'bg-red-50 text-red-700'
  if (status === 'draft') return 'bg-slate-100 text-slate-700'
  return 'bg-white/70 text-[var(--color-text-secondary)]'
}

function isRequiredDocumentMissing(status?: string | null) {
  const normalized = String(status ?? '').toLowerCase()
  return !['approved', 'locked', 'final', 'pending', 'submitted', 'reviewing'].includes(normalized)
}

function SelectedSiteMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white/75 px-3 py-2">
      <div className="text-xs font-medium text-[var(--color-text-tertiary)]">{label}</div>
      <div className="mt-1 truncate text-sm font-bold text-[var(--color-text)]">{value}</div>
    </div>
  )
}

function SimpleSiteStatusBadge({ status }: { status: string }) {
  const config = getSiteStatusConfig(status)
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${config.badgeClass}`}>
      {config.label}
    </span>
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
  } = useSelectedSite()

  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedWorkDate, setSelectedWorkDateState] = useState<string>(today)
  const [siteSummary, setSiteSummary] = useState<HomeSiteSummary>({
    attendanceCount: null,
    worklogStatus: null,
    missingRequiredDocuments: null,
  })
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    const saved = getSelectedWorkDate()
    setSelectedWorkDateState(saved || today)
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

  useEffect(() => {
    if (!user || !selectedSiteId || isPartnerUser) {
      setSiteSummary({
        attendanceCount: null,
        worklogStatus: null,
        missingRequiredDocuments: null,
      })
      return
    }

    let cancelled = false
    const currentUser = user

    async function loadSummary() {
      setSummaryLoading(true)
      const supabase = createClient()
      const parsedSelectedDate = parseISO(selectedWorkDate)
      const selectedDate = isValid(parsedSelectedDate) ? parsedSelectedDate : new Date()
      const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd')

      try {
        const dailyLogsQuery = supabase
          .from('daily_logs')
          .select('id, status, work_date')
          .eq('site_id', selectedSiteId)
          .gte('work_date', monthStart)
          .lte('work_date', monthEnd)

        const selectedDateQuery = supabase
          .from('daily_logs')
          .select('id, status, work_date')
          .eq('site_id', selectedSiteId)
          .eq('work_date', selectedWorkDate)
          .order('created_at', { ascending: false })
          .limit(1)

        const requiredDocsQuery = supabase
          .from('worker_required_documents')
          .select('status')
          .eq('user_id', currentUser.userId)
          .eq('site_id', selectedSiteId)

        if (currentUser.role === 'worker') {
          dailyLogsQuery.eq('user_id', currentUser.userId)
          selectedDateQuery.eq('user_id', currentUser.userId)
        }

        const [dailyLogsResponse, selectedDateResponse, requiredDocsResponse] = await Promise.all([
          dailyLogsQuery,
          selectedDateQuery,
          currentUser.role === 'worker'
            ? requiredDocsQuery
            : Promise.resolve({ data: null, error: null }),
        ])

        if (cancelled) return

        const monthlyLogs = (dailyLogsResponse.data ?? []) as DailyLogSummaryRow[]
        const selectedDateLog = ((selectedDateResponse.data ?? []) as DailyLogSummaryRow[])[0]
        const requiredDocs = (requiredDocsResponse.data ?? []) as RequiredDocumentRow[]

        setSiteSummary({
          attendanceCount: dailyLogsResponse.error ? null : monthlyLogs.length,
          worklogStatus: selectedDateResponse.error ? null : selectedDateLog?.status ?? null,
          missingRequiredDocuments:
            currentUser.role === 'worker' && !requiredDocsResponse.error
              ? requiredDocs.filter(doc => isRequiredDocumentMissing(doc.status)).length
              : null,
        })
      } catch {
        if (!cancelled) {
          setSiteSummary({
            attendanceCount: null,
            worklogStatus: null,
            missingRequiredDocuments: null,
          })
        }
      } finally {
        if (!cancelled) setSummaryLoading(false)
      }
    }

    void loadSummary()
    return () => {
      cancelled = true
    }
  }, [isPartnerUser, selectedSiteId, selectedWorkDate, user])

  const selectedSiteRoute = selectedSiteId ? `${ROUTES.site}/${selectedSiteId}` : ROUTES.site
  const worklogRoute = `${ROUTES.worklog}${selectedSiteId ? `?site=${selectedSiteId}&date=${selectedWorkDate}` : `?date=${selectedWorkDate}`}`
  const outputRoute = `${ROUTES.output}?date=${selectedWorkDate}`
  const documentsRoute = ROUTES.documents
  const photosRoute = selectedSiteRoute

  const quickActions = useMemo(
    () => [
      {
        href: worklogRoute,
        label: '일지작성',
        imageSrc: '/home/quick-actions/worklog.png',
        show: !isPartnerUser,
      },
      {
        href: outputRoute,
        label: '출역확인',
        imageSrc: '/home/quick-actions/output.png',
        show: true,
      },
      {
        href: photosRoute,
        label: '사진/도면',
        imageSrc: '/home/quick-actions/photo-drawing.png',
        show: true,
      },
      {
        href: documentsRoute,
        label: '문서함',
        imageSrc: '/home/quick-actions/documents.png',
        show: true,
      },
    ],
    [documentsRoute, isPartnerUser, outputRoute, photosRoute, worklogRoute]
  )

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
        <div className="text-lg font-semibold text-[var(--color-navy)]">현장 검색</div>
        <SiteCombobox
          sites={accessibleSites}
          selectedId={selectedSiteId}
          onSelect={id => {
            void setSelectedSiteId(id)
          }}
          label=""
        />
      </section>

      {selectedSite ? (
        <>
          <section className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-accent-light)] to-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <Building2 className="h-5 w-5 shrink-0 text-[var(--color-accent)]" strokeWidth={1.9} />
                <span className="truncate font-bold text-[var(--color-navy)]">{selectedSite.name}</span>
                <SimpleSiteStatusBadge status={selectedSite.status} />
              </div>
              <div className="mt-3 grid gap-1.5 text-sm text-[var(--color-text-secondary)]">
                <div className="truncate">원청사: {selectedSite.company || '정보 없음'}</div>
                <div className="truncate">소속: {selectedSite.affiliation || user?.profile?.affiliation || user?.company || '정보 없음'}</div>
                {selectedSite.address && (
                  <div className="flex min-w-0 items-start gap-1">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                    <span className="line-clamp-1">{selectedSite.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <SelectedSiteMetric
              label="누적 출역"
              value={summaryLoading ? '확인 중' : siteSummary.attendanceCount === null ? '정보 없음' : `${siteSummary.attendanceCount}건`}
            />
            <div className={`rounded-xl border border-[var(--color-border)] px-3 py-2 ${getWorklogStatusClass(siteSummary.worklogStatus)}`}>
              <div className="text-xs font-medium opacity-80">일지 상태</div>
              <div className="mt-1 truncate text-sm font-bold">
                {summaryLoading ? '확인 중' : getWorklogStatusLabel(siteSummary.worklogStatus)}
              </div>
            </div>
            <SelectedSiteMetric
              label="필수서류"
              value={
                summaryLoading
                  ? '확인 중'
                  : siteSummary.missingRequiredDocuments === null
                    ? '정보 없음'
                    : `${siteSummary.missingRequiredDocuments}건 미제출`
              }
            />
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href={selectedSiteRoute}
              className="flex h-11 flex-1 items-center justify-center rounded-full border-2 border-[var(--color-accent)] px-4 text-center text-sm font-semibold text-[var(--color-accent)] transition hover:bg-[var(--color-accent-light)]"
            >
              현장 보기
            </Link>
            <Link
              href={worklogRoute}
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-[var(--color-navy)] px-4 text-center text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)]"
            >
              일지 작성
            </Link>
          </div>

          </section>

          <section className="grid grid-cols-2 gap-2">
            {quickActions.filter(action => action.show).map(({ href, label, imageSrc }) => (
              <Link
                key={`${href}-${label}`}
                href={href}
                className="flex min-h-[72px] items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text)] shadow-sm transition hover:shadow-md"
              >
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-bg)]">
                  <Image
                    src={imageSrc}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-contain p-0.5"
                  />
                  <span className="sr-only">{label}</span>
                </span>
              </Link>
            ))}
          </section>
        </>
      ) : (
        <section className="rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-white p-6 text-center text-sm text-[var(--color-text-secondary)] shadow-sm">
          현장을 검색해서 선택하면 오늘 기준 요약이 표시됩니다.
        </section>
      )}

      <RecentViewedDocuments
        userId={user?.userId}
        siteId={selectedSiteId}
        partnerMode={isPartnerUser}
        limit={4}
      />

      {!selectedSite && accessibleSites.length === 0 && (
        <section className="rounded-2xl bg-white p-6 text-center text-[var(--color-text-secondary)] shadow-sm">
          접근 가능한 현장이 없습니다.
        </section>
      )}
    </div>
  )
}
