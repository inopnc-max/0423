'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import Link from 'next/link'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Eye, EyeOff, FileText, Save, Share2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useSelectedSite } from '@/contexts/selected-site-context'
import { createClient } from '@/lib/supabase/client'
import { hideSalary } from '@/lib/roles'
import { useMenuSearch } from '@/hooks'
import { getSelectedWorkDate, setSelectedWorkDate } from '@/lib/ui-state'
import { useSearchParams } from 'next/navigation'
import { SiteCombobox } from '@/components/site/SiteCombobox'
import { SiteManagerAttendancePanel } from '@/components/site-manager/SiteManagerAttendancePanel'
import { useSiteManagerDashboard } from '@/hooks/site-manager/useSiteManagerDashboard'

interface DailyLog {
  id: string
  site_id: string
  work_date: string
  status: string
  worker_array: unknown
  task_tags: unknown
  site_info: { name: string }
}

interface SalaryEntry {
  id: string
  year: number
  month: number
  man: number
  daily_rate: number
  gross_pay: number
  net_pay: number
  status: string
}

const STATUS_CLASS_NAMES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  pending: '승인대기',
  approved: '승인완료',
  rejected: '반려',
}

type WorkerItem = { name: string | undefined; manDay: number }

function normalizeTaskTagsArray(task_tags: unknown): string[] {
  if (!task_tags) return []
  if (!Array.isArray(task_tags)) return []
  return task_tags.filter((tag): tag is string => typeof tag === 'string')
}

function normalizeTaskSummary(task_tags: unknown): string {
  if (!task_tags) return ''

  if (Array.isArray(task_tags)) {
    const parts = task_tags
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const maybeSummary = (item as { summaryText?: unknown }).summaryText
          if (typeof maybeSummary === 'string') return maybeSummary
          const maybeName = (item as { name?: unknown }).name
          if (typeof maybeName === 'string') return maybeName
        }
        return ''
      })
      .filter(Boolean)
    return parts.join(', ')
  }

  if (typeof task_tags === 'string') return task_tags

  if (task_tags && typeof task_tags === 'object') {
    const maybeTasks = (task_tags as { tasks?: unknown }).tasks
    if (Array.isArray(maybeTasks)) {
      const parts = maybeTasks
        .map(item => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object') {
            const maybeSummary = (item as { summaryText?: unknown }).summaryText
            if (typeof maybeSummary === 'string') return maybeSummary
            const maybeName = (item as { name?: unknown }).name
            if (typeof maybeName === 'string') return maybeName
          }
          return ''
        })
        .filter(Boolean)
      return parts.join(', ')
    }
  }

  return ''
}

function normalizeWorkerItems(worker_array: unknown): WorkerItem[] {
  if (!worker_array) return []
  if (!Array.isArray(worker_array)) return []

  return worker_array
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const obj = item as Record<string, unknown>

      const name = typeof obj.name === 'string' ? obj.name : undefined

      const rawCount =
        typeof obj.manDay === 'number'
          ? obj.manDay
          : typeof obj.man_day === 'number'
            ? obj.man_day
            : typeof obj.count === 'number'
              ? obj.count
              : 0

      const manDay = Number.isFinite(rawCount) ? rawCount : 0
      return { name, manDay }
    })
    .filter((x): x is WorkerItem => x !== null && x.manDay > 0)
}

function getLogTotalManDay(log: DailyLog): number {
  return normalizeWorkerItems(log.worker_array).reduce((sum, item) => sum + (item.manDay || 0), 0)
}

function getDateStatus(logsForDate: DailyLog[]): 'approved' | 'pending' | 'rejected' | 'draft' | 'missing' | 'off' {
  if (!logsForDate || logsForDate.length === 0) return 'missing'

  const statuses = new Set(logsForDate.map(log => log.status))
  if (statuses.has('approved')) return 'approved'
  if (statuses.has('pending')) return 'pending'
  if (statuses.has('rejected')) return 'rejected'
  if (statuses.has('draft')) return 'draft'
  return 'missing'
}

function getCalendarCells(year: number, month: number) {
  const firstDate = new Date(year, month - 1, 1)
  const lastDate = new Date(year, month, 0)
  const startWeekday = firstDate.getDay()
  const totalDays = lastDate.getDate()

  const cells: Array<
    | { kind: 'empty'; key: string }
    | { kind: 'day'; key: string; date: Date; dateKey: string; day: number; isSun: boolean; isSat: boolean }
  > = []

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ kind: 'empty', key: `empty-${year}-${month}-${i}` })
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month - 1, day)
    const dateKey = format(date, 'yyyy-MM-dd')
    const weekday = date.getDay()
    cells.push({
      kind: 'day',
      key: dateKey,
      date,
      dateKey,
      day,
      isSun: weekday === 0,
      isSat: weekday === 6,
    })
  }

  return { firstDate, lastDate, cells }
}

function formatMoney(amount: number): string {
  return amount.toLocaleString()
}

export default function OutputPage() {
  const { user } = useAuth()
  const { selectedSiteId, selectedSite, accessibleSites, setSelectedSiteId } = useSelectedSite()
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const queryDate = searchParams.get('date')

  const [logs, setLogs] = useState<DailyLog[]>([])
  const [salary, setSalary] = useState<SalaryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return queryDate || getSelectedWorkDate() || format(new Date(), 'yyyy-MM-dd')
  })
  const [showSalary, setShowSalary] = useState(false)

  const isPartnerUser = user ? hideSalary(user.role) : false
  const isSiteManagerUser = user?.role === 'site_manager'
  const siteManagerDashboard = useSiteManagerDashboard({
    managerId: isSiteManagerUser ? user?.userId : null,
    managerName: user?.profile?.name,
    siteId: isSiteManagerUser ? selectedSiteId : null,
    siteName: selectedSite?.name,
    workDate: selectedDate,
  })

  const {
    query,
    setQuery,
    filteredOutputLogs,
    loading: searchLoading,
    clear,
  } = useMenuSearch({ scope: 'output' })

  useEffect(() => {
    if (!user) return
    const currentUser = user

    async function fetchData() {
      try {
        const { firstDate, lastDate } = getCalendarCells(selectedYear, selectedMonth)
        const startDate = format(firstDate, 'yyyy-MM-dd')
        const endDate = format(lastDate, 'yyyy-MM-dd')

        if (!selectedSiteId) {
          setLogs([])
          setSalary(null)
          return
        }

        const isWorker = currentUser.role === 'worker'
        const isSiteManagerOrAdmin = currentUser.role === 'site_manager' || currentUser.role === 'admin'
        const isPartner = isPartnerUser

        const dailyLogsSelectFields = isPartner
          ? 'id, site_id, work_date, status, task_tags, site_info'
          : 'id, site_id, work_date, status, worker_array, task_tags, site_info'

        let logsQuery = supabase
          .from('daily_logs')
          .select(dailyLogsSelectFields)
          .eq('site_id', selectedSiteId)
          .gte('work_date', startDate)
          .lte('work_date', endDate)
          .order('work_date', { ascending: true })

        if (isWorker) {
          logsQuery = logsQuery.eq('user_id', currentUser.userId)
        }

        if (isPartner) {
          logsQuery = logsQuery.eq('status', 'approved')
        }

        const [logsResponse, salaryResponse] = await Promise.all([
          logsQuery,
          !isPartnerUser
            ? supabase
                .from('salary_entries')
                .select('*')
                .eq('user_id', currentUser.userId)
                .eq('year', selectedYear)
                .eq('month', selectedMonth)
                .single()
            : Promise.resolve({ data: null, error: null }),
        ])

        if (logsResponse.data) {
          const rawLogs = logsResponse.data as unknown as DailyLog[]
          if (isPartner) {
            const sanitized = rawLogs.map(log => ({
              ...log,
              worker_array: null,
              task_tags: normalizeTaskSummary(log.task_tags),
            }))
            setLogs(sanitized)
          } else if (isSiteManagerOrAdmin) {
            setLogs(rawLogs)
          } else {
            setLogs(rawLogs)
          }
        }

        if (!salaryResponse.error && salaryResponse.data) {
          setSalary(salaryResponse.data)
        } else {
          setSalary(null)
        }
      } catch (error) {
        console.error('Failed to load output data:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [isPartnerUser, selectedMonth, selectedYear, selectedSiteId, supabase, user])

  useEffect(() => {
    if (!queryDate) return
    const parsed = new Date(queryDate)
    if (Number.isNaN(parsed.getTime())) return

    setSelectedDate(queryDate)
    setSelectedWorkDate(queryDate)
    setSelectedYear(parsed.getFullYear())
    setSelectedMonth(parsed.getMonth() + 1)
    setViewMode('calendar')
  }, [queryDate])

  const isSearching = query.trim().length >= 2
  const displayLogs: DailyLog[] = isSearching
    ? (filteredOutputLogs as unknown as DailyLog[])
    : logs

  const totalMan = displayLogs.reduce((sum, log) => {
    if (isPartnerUser) return sum
    return sum + getLogTotalManDay(log)
  }, 0)

  const { cells: calendarCells } = useMemo(
    () => getCalendarCells(selectedYear, selectedMonth),
    [selectedMonth, selectedYear]
  )

  const logsByDate = useMemo(() => {
    const map = new Map<string, DailyLog[]>()
    for (const log of logs) {
      const dateKey = log.work_date
      const current = map.get(dateKey) ?? []
      current.push(log)
      map.set(dateKey, current)
    }
    return map
  }, [logs])

  function handleSelectCalendarDate(dateKey: string) {
    setSelectedDate(dateKey)
    setSelectedWorkDate(dateKey)
  }

  function handlePrevMonth() {
    const newDate = new Date(selectedYear, selectedMonth - 2, 1)
    setSelectedYear(newDate.getFullYear())
    setSelectedMonth(newDate.getMonth() + 1)
  }

  function handleNextMonth() {
    const newDate = new Date(selectedYear, selectedMonth, 1)
    setSelectedYear(newDate.getFullYear())
    setSelectedMonth(newDate.getMonth() + 1)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* 1. 년/월 선택기 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
            aria-label="이전 월"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>

          <div className="text-center">
            <span className="text-lg font-bold text-[var(--color-navy)]">
              {selectedYear}년 {selectedMonth}월
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
            aria-label="다음 월"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </section>

      {/* 2. 현장 콤보박스 */}
      <SiteCombobox
        sites={accessibleSites}
        selectedId={selectedSiteId}
        onSelect={id => {
          void setSelectedSiteId(id)
        }}
      />

      {/* 3. 현장관리자 전용 패널 */}
      {isSiteManagerUser && (
        <SiteManagerAttendancePanel
          workDate={selectedDate}
          siteName={selectedSite?.name}
          logs={siteManagerDashboard.logs}
          workers={siteManagerDashboard.workers}
          summary={siteManagerDashboard.summary}
          loading={siteManagerDashboard.loading}
          submitting={siteManagerDashboard.submitting}
          message={siteManagerDashboard.message}
          onSaveAttendance={siteManagerDashboard.saveAttendance}
        />
      )}

      {/* 4. 출역 보기 전환 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="ui-output-view-switch">
          <div className="ui-output-view-switch__label">
            <div className="ui-output-view-switch__title">출역 보기</div>
          </div>
          <div className="ui-output-view-toggle" role="group" aria-label="출역 보기 방식">
            <button
              type="button"
              className={`ui-output-view-toggle__item${viewMode === 'list' ? ' is-active' : ''}`}
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              리스트보기
            </button>
            <button
              type="button"
              className={`ui-output-view-toggle__item${viewMode === 'calendar' ? ' is-active' : ''}`}
              aria-pressed={viewMode === 'calendar'}
              onClick={() => setViewMode('calendar')}
            >
              전체보기
            </button>
          </div>
        </div>
      </section>

      {/* 5. 달력 또는 리스트 */}
      <section>
        <h2 className="mb-3 font-semibold text-[var(--color-navy)]">
          {isSearching ? '검색 결과' : viewMode === 'calendar' ? '월별 출역 달력' : '최근 출역 기록'}
        </h2>

        {viewMode === 'calendar' && (
          <>
            {!selectedSiteId ? (
              <div className="rounded-2xl bg-[var(--color-bg)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
                현장을 선택해주세요.
              </div>
            ) : (
              <section className="ui-calendar">
                <div className="ui-calendar__grid" role="grid" aria-label="월별 출역 달력">
                  {['일', '월', '화', '수', '목', '금', '토'].map((label, idx) => (
                    <div
                      key={label}
                      className={`ui-calendar__weekday${idx === 0 ? ' is-sun' : idx === 6 ? ' is-sat' : ''}`}
                      role="columnheader"
                    >
                      {label}
                    </div>
                  ))}

                  {calendarCells.map(cell => {
                    if (cell.kind === 'empty') {
                      return <div key={cell.key} className="ui-date-cell ui-date-cell--off" aria-hidden="true" />
                    }

                    const logsForDate = logsByDate.get(cell.dateKey) ?? []
                    const status = getDateStatus(logsForDate)
                    const statusClass = `ui-date-cell--${status}`

                    const firstLog = logsForDate[0]
                    const siteName = firstLog?.site_info?.name ?? ''
                    const taskSummary = normalizeTaskSummary(firstLog?.task_tags)

                    const manDayText = (() => {
                      if (isPartnerUser) {
                        const workerCount = logsForDate.length
                        return workerCount > 0 ? `${workerCount}건` : ''
                      }
                      const total = logsForDate.reduce((sum, log) => sum + getLogTotalManDay(log), 0)
                      return total > 0 ? `${total}` : ''
                    })()

                    const dots = (() => {
                      const statuses = new Set(logsForDate.map(log => log.status))
                      const list: Array<'approved' | 'pending' | 'rejected' | 'draft'> = []
                      if (statuses.has('approved')) list.push('approved')
                      if (statuses.has('pending')) list.push('pending')
                      if (statuses.has('rejected')) list.push('rejected')
                      if (statuses.has('draft')) list.push('draft')
                      return list.slice(0, 3)
                    })()

                    return (
                      <div
                        key={cell.key}
                        className={`ui-date-cell ${statusClass}${cell.isSun ? ' is-sun' : ''}${cell.isSat ? ' is-sat' : ''}`}
                        role="gridcell"
                      >
                        <button
                          type="button"
                          className={`ui-date-cell__button${
                            cell.dateKey === selectedDate
                              ? ' is-selected outline outline-2 outline-[var(--color-accent)] outline-offset-[-2px]'
                              : ''
                          }`}
                          aria-pressed={cell.dateKey === selectedDate}
                          onClick={() => handleSelectCalendarDate(cell.dateKey)}
                        >
                          <div className="ui-date-cell__day">{cell.day}</div>
                          <div className="ui-date-cell__site min-w-0 overflow-hidden truncate">{siteName}</div>
                          {manDayText ? <div className="ui-date-cell__man-day">{manDayText}</div> : <div className="ui-date-cell__man-day">&nbsp;</div>}
                          <div className="ui-date-cell__dots" aria-hidden="true">
                            {dots.map(dot => (
                              <span
                                key={dot}
                                className={`ui-date-cell__dot${dot === 'approved' ? ' is-success' : dot === 'pending' ? ' is-warning' : dot === 'rejected' ? ' is-danger' : ' is-navy'}`}
                              />
                            ))}
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* 선택 날짜 카드 */}
        {viewMode === 'calendar' && selectedSiteId && (() => {
          const selectedLogs = logsByDate.get(selectedDate) ?? []
          const parsedSelected = new Date(selectedDate)
          const selectedDateLabel =
            selectedDate && !Number.isNaN(parsedSelected.getTime())
              ? format(parsedSelected, 'yyyy년 M월 d일 (EEE)', { locale: ko })
              : ''
          const selectedTotalManDay = selectedLogs.reduce((sum, log) => sum + getLogTotalManDay(log), 0)
          const firstSelectedLog = selectedLogs[0]
          const selectedSiteName = firstSelectedLog?.site_info?.name ?? ''
          const selectedTaskSummary = normalizeTaskSummary(firstSelectedLog?.task_tags)

          return (
            <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--color-navy)]">선택 날짜</h3>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{selectedDateLabel}</p>
                </div>
                <span className="rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                  {selectedLogs.length}건
                </span>
              </div>

              {selectedLogs.length === 0 ? (
                <div className="py-3 text-center text-sm text-[var(--color-text-tertiary)]">
                  선택한 날짜의 출역 기록이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedLogs.map(log => (
                      <span
                        key={log.id}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS_NAMES[log.status] || 'bg-slate-100 text-slate-700'}`}
                      >
                        {STATUS_LABELS[log.status] || log.status}
                      </span>
                    ))}
                  </div>
                  {selectedSiteName && (
                    <div className="text-sm text-[var(--color-text-secondary)]">현장: {selectedSiteName}</div>
                  )}
                  {selectedTaskSummary && (
                    <div className="text-sm text-[var(--color-text-secondary)]">작업: {selectedTaskSummary}</div>
                  )}
                  {!isPartnerUser && selectedTotalManDay > 0 && (
                    <div className="text-sm font-semibold text-[var(--color-accent)]">
                      총 {selectedTotalManDay}공수
                    </div>
                  )}
                </div>
              )}

              {!isPartnerUser && selectedSiteId && (
                <div className="mt-4">
                  <Link
                    href={`/worklog?site=${selectedSiteId}&date=${selectedDate}`}
                    className="flex items-center justify-center gap-2 rounded-full border-2 border-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-[var(--color-accent-light)]"
                  >
                    이 날짜 일지 작성
                  </Link>
                </div>
              )}
            </section>
          )
        })()}

        {/* 리스트 뷰 */}
        {viewMode === 'list' && (
          <>
            {(loading || searchLoading) ? (
              <div className="rounded-2xl bg-white p-6 text-center text-sm text-[var(--color-text-secondary)] shadow-sm">
                로딩 중...
              </div>
            ) : displayLogs.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center text-sm text-[var(--color-text-secondary)] shadow-sm">
                {isSearching ? '검색 결과가 없습니다.' : '출역 기록이 없습니다.'}
              </div>
            ) : (
              <div className="space-y-3">
                {displayLogs.map(log => (
                  <article key={log.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[var(--color-text)]">{log.site_info?.name || '현장'}</div>
                        <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                          {format(new Date(log.work_date), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS_NAMES[log.status] || 'bg-slate-100 text-slate-700'}`}>
                        {STATUS_LABELS[log.status] || log.status}
                      </span>
                    </div>
                    {normalizeTaskTagsArray(log.task_tags).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {normalizeTaskTagsArray(log.task_tags).map(tag => (
                          <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-[var(--color-text-secondary)]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* 6. 월간 요약 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-[var(--color-navy)]">출역 요약</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--color-navy)]">{displayLogs.length}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">작업일</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--color-accent)]">{totalMan}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">총 공수</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {displayLogs.filter(log => log.status === 'approved').length}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">승인완료</div>
          </div>
        </div>
      </section>

      {/* 7. 급여 현황 */}
      {!isPartnerUser && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-navy)]">급여 현황</h2>
            <button
              type="button"
              onClick={() => setShowSalary(v => !v)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg)]"
              aria-label={showSalary ? '급여 숨기기' : '급여 보기'}
            >
              {showSalary ? <EyeOff className="h-4 w-4" strokeWidth={1.9} /> : <Eye className="h-4 w-4" strokeWidth={1.9} />}
              {showSalary ? '숨기기' : '보기'}
            </button>
          </div>

          {salary ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50 p-3">
                  <div className="text-xs text-blue-600">일당</div>
                  <div className="mt-1 text-lg font-bold text-blue-700">
                    {showSalary ? `${formatMoney(salary.daily_rate)}원` : '******'}
                  </div>
                </div>
                <div className="rounded-xl bg-green-50 p-3">
                  <div className="text-xs text-green-600">총 공수</div>
                  <div className="mt-1 text-lg font-bold text-green-700">{salary.man}공수</div>
                </div>
                <div className="col-span-2 rounded-xl bg-[var(--color-navy)] p-3 text-white">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/70">실수령액</div>
                    {showSalary && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white/80">
                        3.3% 세금공제
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xl font-bold">
                    {showSalary ? `${formatMoney(salary.net_pay)}원` : '******'}
                  </div>
                </div>
              </div>

              {/* 급여명세서 퀵 버튼 */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-xs font-medium text-[var(--color-text-tertiary)] transition disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" strokeWidth={1.9} />
                  보기
                </button>
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-xs font-medium text-[var(--color-text-tertiary)] transition disabled:opacity-50"
                >
                  <Save className="h-4 w-4" strokeWidth={1.9} />
                  저장(PDF)
                </button>
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-xs font-medium text-[var(--color-text-tertiary)] transition disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.9} />
                  공유
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-[var(--color-bg)] px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
              등록된 급여 데이터가 없습니다.
            </div>
          )}
        </section>
      )}
    </div>
  )
}
