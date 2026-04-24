'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { hideSalary } from '@/lib/roles'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  Share,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { SalaryHistoryEntry, CalendarEntry } from '@/lib/output-types'
import { A4_WIDTH_PX, OFFSCREEN_LEFT, PDF_SCALE, addCanvasToPdf, downloadBlob, preparePdfCapture } from '@/lib/output-utils'

// 상수: 세율 / 회사명 / 요일
const DEDUCTION_RATE = 0.033
const COMPANY_NAME = '주노앤써츠'
const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

// 타입: Supabase에서 가져오는 데이터 구조
interface DailyLog {
  id: string
  site_id: string
  work_date: string
  status: string
  worker_array: { name: string; count: number }[]
  task_tags: string[]
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

interface WorkerProfile {
  id: string
  name: string
  daily: number
  affiliation: string
}

// 상태: 상태별 클래스/라벨 매핑
const STATUS_CLASS_NAMES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  pending: '대기중',
  approved: '승인완료',
  rejected: '반려',
}

// 유틸: 금액 포맷팅
const formatCurrency = (n: number) => n.toLocaleString()

// 유틸: site 이름 축약
function compactSiteLabel(siteName: string) {
  return (siteName || '').replace(/\s+/g, '').slice(0, 4)
}

// 급여명세서 콘텐츠 (모바일/A4 모두 동일한 구조)
function PayStubContent({
  stub,
  workerName,
  workerAffiliation,
  paystubGross,
  paystubDeductions,
  paystubNet,
}: {
  stub: SalaryHistoryEntry
  workerName: string
  workerAffiliation: string
  paystubGross: number
  paystubDeductions: number
  paystubNet: number
}) {
  return (
    <>
      {/* 헤더 */}
      <div className="flex justify-between items-end border-b-2 border-[var(--color-navy)] pb-5 mb-8">
        <div>
          <h2 className="text-[28px] font-bold text-[var(--color-navy)] tracking-tight leading-tight m-0">
            급여명세서
          </h2>
          <span className="text-[18px] font-semibold text-[var(--color-navy)]">{stub.month}</span>
        </div>
        <div className="text-right">
          <div className="text-[14px] font-semibold text-[var(--color-text-main)]">{COMPANY_NAME}</div>
          <div className="text-[12px] text-[var(--color-text-sub)]">{stub.rawDate}-25 기준</div>
        </div>
      </div>

      {/* 근골 정보 테이블 */}
      <table className="w-full border-collapse mb-5 border border-[#d1d5db]">
        <tbody>
          <tr>
            <th className="bg-[#f8fafc] text-[var(--color-navy)] font-semibold text-[13px] p-2 border border-[#d1d5db] w-1/4 text-center">성명</th>
            <td className="font-medium text-[13px] p-2 border border-[#d1d5db] text-center">{workerName}</td>
            <th className="bg-[#f8fafc] text-[var(--color-navy)] font-semibold text-[13px] p-2 border border-[#d1d5db] w-1/4 text-center">소속</th>
            <td className="font-medium text-[13px] p-2 border border-[#d1d5db] text-center">{workerAffiliation}</td>
          </tr>
          <tr>
            <th className="bg-[#f8fafc] text-[var(--color-navy)] font-semibold text-[13px] p-2 border border-[#d1d5db] w-1/4 text-center">일수</th>
            <td className="font-medium text-[13px] p-2 border border-[#d1d5db] text-center">{stub.man.toFixed(1)}</td>
            <th className="bg-[#f8fafc] text-[var(--color-navy)] font-semibold text-[13px] p-2 border border-[#d1d5db] w-1/4 text-center">일당</th>
            <td className="font-medium text-[13px] p-2 border border-[#d1d5db] text-center">
              ₩{formatCurrency(stub.price ?? 0)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 공제/지급 내역 테이블 */}
      <table className="w-full border-collapse mb-0 border-t border-[var(--color-navy)]">
        <tbody>
          <tr>
            <th colSpan={2} className="bg-[var(--color-navy)] text-white text-[13px] font-semibold text-center p-2 border border-[#556080] border-b-0">
              공제내역
            </th>
            <th colSpan={2} className="bg-[var(--color-navy)] text-white text-[13px] font-semibold text-center p-2 border border-[#556080] border-b-0">
              지급내역
            </th>
          </tr>
          <tr>
            <td className="bg-[#e0f2fe] text-[var(--color-navy)] font-semibold text-[13px] text-center p-2 border border-[#d1d5db]">공제</td>
            <td className="bg-[#e0f2fe] text-[var(--color-navy)] font-semibold text-[13px] text-center p-2 border border-[#d1d5db]">공제액</td>
            <td className="bg-[#e0f2fe] text-[var(--color-navy)] font-semibold text-[13px] text-center p-2 border border-[#d1d5db]">지급</td>
            <td className="bg-[#e0f2fe] text-[var(--color-navy)] font-semibold text-[13px] text-center p-2 border border-[#d1d5db]">지급액</td>
          </tr>
          <tr>
            <td className="p-2 border border-[#d1d5db] text-[13px]">공제</td>
            <td className="p-2 border border-[#d1d5db] text-[13px] text-right font-medium">
              ₩{formatCurrency(paystubGross)}
            </td>
            <td className="p-2 border border-[#d1d5db] text-[13px]">4대 보험</td>
            <td className="p-2 border border-[#d1d5db] text-[13px] text-right font-medium">
              ₩{formatCurrency(paystubDeductions)}
            </td>
          </tr>
          <tr className="bg-[#f8fafc] font-semibold">
            <td className="p-2 border border-[#d1d5db] text-[13px]">총 공제액</td>
            <td className="p-2 border border-[#d1d5db] text-[13px] text-right">₩{formatCurrency(paystubGross)}</td>
            <td className="p-2 border border-[#d1d5db] text-[13px]">공제 후</td>
            <td className="p-2 border border-[#d1d5db] text-[13px] text-right">₩{formatCurrency(paystubDeductions)}</td>
          </tr>
        </tbody>
      </table>

      {/* 실수령액 하이라이트 */}
      <div className="mt-5 bg-[var(--color-accent-soft)] rounded-2xl p-5 flex justify-between items-center">
        <span className="text-[15px] font-semibold text-[var(--color-navy)]">실수령액</span>
        <span className="text-[24px] font-bold text-[#2563eb]">₩{formatCurrency(paystubNet)}</span>
      </div>

      {/* 모바일 카드 레이아웃 (모바일 전용) */}
      <div className="mt-4 sm:hidden">
        <div className="border border-[#d1d5db] rounded-2xl overflow-hidden">
          <div className="bg-[var(--color-navy)] text-white text-[13px] font-semibold text-center py-2">일일 근무 내역</div>
          <div className="divide-y divide-[#e5e7eb]">
            {[
              { label: '일수', value: stub.man.toFixed(1) },
              { label: '일당', value: `₩${formatCurrency(stub.price ?? 0)}` },
              { label: '공제', value: `₩${formatCurrency(paystubGross)}` },
              { label: '공제', value: `-₩${formatCurrency(paystubDeductions)}`, valueClass: 'text-red-500' },
              { label: '실수령액', value: `₩${formatCurrency(paystubNet)}`, highlight: true },
            ].map(({ label, value, valueClass, highlight }) => (
              <div key={label} className="flex justify-between items-center px-4 py-3 text-[13px]">
                <span className="font-semibold text-[var(--color-text-sub)]">{label}</span>
                <span className={`font-semibold ${highlight ? 'text-[#2563eb] font-bold' : 'text-[var(--color-text-main)]'} ${valueClass || ''}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 데스크탑 테이블 레이아웃 (데스크탑 전용) */}
      <table className="hidden sm:table w-full border-collapse mt-4">
        <tbody>
          <tr className="bg-[var(--color-navy)] text-white font-semibold text-[13px]">
            <td colSpan={5} className="p-2 text-center">일일 근무 내역</td>
          </tr>
          <tr>
            {[
              stub.man.toFixed(1),
              `₩${formatCurrency(stub.price ?? 0)}`,
              `₩${formatCurrency(paystubGross)}`,
              `₩${formatCurrency(paystubDeductions)}`,
              `₩${formatCurrency(paystubNet)}`,
            ].map((val, i) => (
              <td key={i} className="p-2 border border-[#d1d5db] text-[12px] text-center">{val}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <p className="mt-6 text-center text-[12px] text-[var(--color-text-sub)]">
        본 명세서는 법정 원천징수영수증, 4대 보험료 고지서, 국민연금납부확인서 등 의무서류가 아닙니다.
      </p>
    </>
  )
}

// 급여청구서 콘텐츠 (청구서 — 월 단위 A4)
function PayRequestContent({
  year,
  month,
  shareTotals,
  shareCalendarCells,
  workerDisplayName,
}: {
  year: number
  month: number
  shareTotals: { totalMan: number; totalPay: number; deduction: number; netPay: number }
  shareCalendarCells: ({ day: number; isToday: boolean; entries: CalendarEntry[] } | null)[]
  workerDisplayName: string
}) {
  return (
    <>
      <div className="text-[32px] font-bold text-[#1e2a57]">급여 청구서</div>
      <div className="mt-2 text-[20px] font-semibold text-[var(--color-text-sub)]">{year}년 {month}월</div>
      <div className="mt-4 h-[2px] bg-[#1e2a57]" />

      <div className="mt-8 flex justify-between items-start">
        <div />
        <div className="text-right">
          <div className="text-[15px] font-semibold text-[var(--color-text-sub)]">청구 총액</div>
          <div className="mt-2 text-[36px] font-bold text-[#3b82f6]">
            {formatCurrency(shareTotals.netPay)}원
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[20px] bg-[#f8fafc] p-6 border border-[#e2e8f0]">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-[14px] font-semibold text-[var(--color-text-sub)]">일 총계</div>
            <div className="mt-1 text-[24px] font-bold">{shareTotals.totalMan.toFixed(1)} 일</div>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[var(--color-text-sub)]">급여 총계</div>
            <div className="mt-1 text-[24px] font-bold">{formatCurrency(shareTotals.totalPay)}원</div>
          </div>
        </div>
        <div className="mt-4 border-t border-dashed border-[#cbd5e1]" />
        <div className="mt-4 flex justify-between items-center text-[15px] font-semibold text-[var(--color-text-sub)]">
          <span>공제 (3.3%)</span>
          <span className="text-red-500">-{formatCurrency(shareTotals.deduction)}원</span>
        </div>
      </div>

      {/* 캘린더 영역 */}
      <div className="mt-8 rounded-[22px] border border-[#e2e8f0] overflow-hidden">
        <div className="grid grid-cols-7 bg-[#f8fafc] text-center text-[14px] font-semibold">
          {WEEK_DAYS.map((d, i) => (
            <div
              key={d}
              className={`py-3 border-r border-[#e2e8f0] last:border-r-0 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-500' : 'text-[var(--color-text-sub)]'
              }`}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {shareCalendarCells.map((cell, idx) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${idx}`}
                  className={`h-[80px] border-r border-b border-[#e2e8f0] ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}`}
                />
              )
            }

            const totalMan = cell.entries.reduce((s, e) => s + e.man, 0)
            const totalPay = cell.entries.reduce((s, e) => s + e.price, 0)
            let siteLabel = ''
            if (cell.entries.length > 0) {
              const base = cell.entries[0].site.replace(/\s+/g, '')
              siteLabel = cell.entries.length > 1 ? `${base.slice(0, 4)}+${cell.entries.length - 1}` : base.slice(0, 4)
            }

            return (
              <div
                key={`day-${cell.day}`}
                className={`h-[80px] border-r border-b border-[#e2e8f0] p-2 ${
                  (idx + 1) % 7 === 0 ? 'border-r-0' : ''
                }`}
              >
                <div className="text-[14px] font-semibold text-[var(--color-text-main)]">{cell.day}</div>
                {cell.entries.length > 0 && (
                  <div className="mt-0.5 text-[11px] leading-tight">
                    <div className="font-semibold text-[var(--color-text-main)]">{totalMan.toFixed(1)}일</div>
                    <div className="font-bold text-[#3b82f6]">{(totalPay / 10000).toFixed(0)}만</div>
                    <div className="truncate text-[var(--color-text-sub)]">{siteLabel}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-8 text-center text-[12px] text-[var(--color-text-tertiary)] font-medium">
        Generated by {COMPANY_NAME} App
      </div>
    </>
  )
}

// 메인: 출역 메인 페이지
export default function OutputPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const today = new Date()
  const [activeTab, setActiveTab] = useState<'output' | 'salary' | 'admin'>('output')
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [filterSite, setFilterSite] = useState('')
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(today.getFullYear())
  const [isPrivacyOn, setIsPrivacyOn] = useState(true)
  const [salHistoryExpanded, setSalHistoryExpanded] = useState(false)
  const [salFilterYear, setSalFilterYear] = useState(today.getFullYear())
  const [salFilterMonth, setSalFilterMonth] = useState<number | null>(null)
  const [salSortFilter, setSalSortFilter] = useState('latest')
  const [showSalDatePicker, setShowSalDatePicker] = useState(false)
  const [salPickerYear, setSalPickerYear] = useState(today.getFullYear())
  const [isPayStubOpen, setIsPayStubOpen] = useState(false)
  const [selectedPayStub, setSelectedPayStub] = useState<SalaryHistoryEntry | null>(null)
  const [editModal, setEditModal] = useState<{ date: string; entries: CalendarEntry[] } | null>(null)

  const paystubRef = useRef<HTMLDivElement>(null)
  const paystubPdfRef = useRef<HTMLDivElement>(null)
  const payRequestRef = useRef<HTMLDivElement>(null)

  // Partner 사용자 체크
  const isPartnerUser = user ? hideSalary(user.role) : false
  const isAdmin = user?.role === 'admin' || user?.role === 'site_manager'

  // 데이터: 일별 근태 로그 / worker 프로필
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)

    void (async () => {
      try {
        const [logsRes, workerRes] = await Promise.all([
          supabase
            .from('daily_logs')
            .select('id, site_id, work_date, status, worker_array, task_tags, site_info')
            .eq('user_id', user.userId)
            .order('work_date', { ascending: false }),
          supabase.from('workers').select('id, name, daily, affiliation').eq('id', user.userId).single(),
        ])

        if (logsRes.data) setLogs(logsRes.data)
        if (workerRes.data) setWorkerProfile(workerRes.data)
      } catch (err) {
        console.error('[output] fetch error', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [supabase, user])

  const workerDisplayName = workerProfile?.name || user?.profile?.name || user?.email?.split('@')[0] || '-'
  const workerAffiliation = workerProfile?.affiliation || user?.profile?.affiliation || COMPANY_NAME
  const dailyRate = workerProfile?.daily || user?.profile?.daily || 0

  // 데이터: workData: 일별 현장별 데이터 통합
  const workData = useMemo(() => {
    const data: Record<string, CalendarEntry[]> = {}
    logs.forEach(log => {
      if (!log.worker_array) return
      const dateKey = log.work_date
      const dayEntries: CalendarEntry[] = []
      log.worker_array.forEach(w => {
        const man = w.count || 0
        if (man <= 0) return
        const price = dailyRate > 0 ? Math.round(man * dailyRate) : 0
        const siteName = log.site_info?.name || '알 수 없음'
        const existing = dayEntries.find(e => e.site === siteName)
        if (existing) {
          existing.man = Math.round((existing.man + man) * 10) / 10
          existing.price += price
        } else {
          dayEntries.push({ site: siteName, man, price, worker: w.name || workerDisplayName })
        }
      })
      if (dayEntries.length > 0) data[dateKey] = dayEntries
    })
    return data
  }, [logs, dailyRate, workerDisplayName])

  // 데이터: 캘린더 렌더링 정보
  const calendarData = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay()
    const lastDate = new Date(currentYear, currentMonth, 0).getDate()
    const cells: { day: number; isToday: boolean; entries: CalendarEntry[] }[] = []

    for (let d = 1; d <= lastDate; d++) {
      const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      let entries = workData[dateKey] || []
      if (filterSite) entries = entries.filter(e => e.site === filterSite)
      const isToday =
        today.getFullYear() === currentYear &&
        today.getMonth() + 1 === currentMonth &&
        today.getDate() === d
      cells.push({ day: d, isToday, entries })
    }

    return { firstDay, cells }
  }, [currentYear, currentMonth, filterSite, workData])

  // 데이터: 요약 통계
  const summaryStats = useMemo(() => {
    const sites = new Set<string>()
    let totalMan = 0
    let workedDays = 0

    calendarData.cells.forEach(cell => {
      if (cell.entries.length > 0) {
        workedDays++
        cell.entries.forEach(e => {
          if (e.site) sites.add(e.site)
          totalMan += e.man
        })
      }
    })

    return { totalSites: sites.size, totalMan, workedDays }
  }, [calendarData])

  // 데이터: 월별 급여청구 합계
  const shareTotals = useMemo(() => {
    let totalMan = 0
    let totalPay = 0
    calendarData.cells.forEach(cell => {
      cell.entries.forEach(e => {
        totalMan += e.man
        totalPay += e.price
      })
    })
    const deduction = Math.floor(totalPay * DEDUCTION_RATE)
    const netPay = totalPay - deduction
    return { totalMan, totalPay, deduction, netPay }
  }, [calendarData])

  const shareCalendarCells = useMemo(() => {
    const daysInMonth = calendarData.cells.length
    const totalSlots = Math.ceil((calendarData.firstDay + daysInMonth) / 7) * 7
    return Array.from({ length: totalSlots }, (_, idx) => {
      const day = idx - calendarData.firstDay + 1
      if (day < 1 || day > daysInMonth) return null
      return calendarData.cells[day - 1]
    })
  }, [calendarData])

  // 데이터: 현장 필터 옵션 (최신순)
  const siteFilterOptions = useMemo(() => {
    const latestBySite = new Map<string, { value: string; label: string; latestKey: string }>()
    Object.entries(workData).forEach(([dateKey, entries]) => {
      entries.forEach(entry => {
        const name = (entry.site || '').trim()
        if (!name) return
        const prev = latestBySite.get(name)
        if (!prev || dateKey > prev.latestKey) {
          latestBySite.set(name, { value: name, label: name, latestKey: dateKey })
        }
      })
    })
    return Array.from(latestBySite.values()).sort((a, b) => b.latestKey.localeCompare(a.latestKey))
  }, [workData])

  // 데이터: 급여 히스토리 (월별 집계)
  const salaryHistory = useMemo<SalaryHistoryEntry[]>(() => {
    const grouped = new Map<string, { man: number; grossPay: number }>()

    Object.entries(workData).forEach(([dateKey, entries]) => {
      const rawDate = dateKey.slice(0, 7)
      if (!rawDate) return
      entries.forEach(entry => {
        const bucket = grouped.get(rawDate) || { man: 0, grossPay: 0 }
        bucket.man += entry.man
        bucket.grossPay += entry.price
        grouped.set(rawDate, bucket)
      })
    })

    return Array.from(grouped.entries())
      .map(([rawDate, bucket]) => {
        const [yearVal, monthVal] = rawDate.split('-').map(Number)
        const grossPay = bucket.grossPay
        const deductions = Math.floor(grossPay * DEDUCTION_RATE)
        return {
          rawDate,
          month: `${yearVal}년 ${monthVal}월`,
          baseTotal: grossPay,
          man: Math.round(bucket.man * 10) / 10,
          price: dailyRate,
          year: yearVal,
          netPay: Math.max(0, grossPay - deductions),
          grossPay,
          deductions,
        } satisfies SalaryHistoryEntry
      })
      .sort((a, b) => b.rawDate.localeCompare(a.rawDate))
  }, [workData, dailyRate])

  const filteredSalary = useMemo(() => {
    let list = salaryHistory.filter(s => s.year === salFilterYear)
    if (salFilterMonth !== null) {
      list = list.filter(s => {
        const m = parseInt(s.rawDate.split('-')[1])
        return m === salFilterMonth
      })
    }
    if (salSortFilter === 'amount') {
      list = [...list].sort((a, b) => b.baseTotal - a.baseTotal)
    }
    return list
  }, [salFilterYear, salFilterMonth, salSortFilter, salaryHistory])

  const displayedSalary = salHistoryExpanded ? filteredSalary : filteredSalary.slice(0, 3)

  const currentSalary =
    salaryHistory.find(s => s.rawDate === `${currentYear}-${String(currentMonth).padStart(2, '0')}`) ||
    salaryHistory[0] || {
      rawDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
      month: `${currentYear}년 ${currentMonth}월`,
      baseTotal: 0,
      man: 0,
      price: dailyRate,
      year: currentYear,
      netPay: 0,
      grossPay: 0,
      deductions: 0,
    }

  // 핸들러: 월 변경
  const changeMonth = (delta: number) => {
    let m = currentMonth + delta
    let y = currentYear
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setCurrentMonth(m)
    setCurrentYear(y)
  }

  // 핸들러: 급여명세서 열기
  const openPayStub = (sal: SalaryHistoryEntry) => {
    setSelectedPayStub(sal)
    setIsPayStubOpen(true)
  }

  // 핸들러: PDF 다운로드 (dynamic import로 SSR 방지)
  const downloadPayStubPDF = useCallback(async () => {
    const source = paystubPdfRef.current
    if (!source || !selectedPayStub) return

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const temp = preparePdfCapture(source)
      document.body.appendChild(temp)

      try {
        const canvas = await html2canvas(temp, {
          scale: PDF_SCALE,
          backgroundColor: '#ffffff',
          useCORS: true,
        })
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
        addCanvasToPdf(pdf, imgData, canvas.width, canvas.height)
        pdf.save(`급여명세서_${selectedPayStub.rawDate}.pdf`)
      } finally {
        temp.remove()
      }
    } catch {
      alert('PDF 생성 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }, [selectedPayStub])

  // 핸들러: 급여 청구서 공유/다운로드
  const handlePaymentRequest = useCallback(async () => {
    if (!payRequestRef.current) return

    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(payRequestRef.current, {
        scale: PDF_SCALE,
        backgroundColor: '#ffffff',
        useCORS: true,
      })
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1))
      if (!blob) {
        alert('이미지 생성 중 문제가 발생했습니다.')
        return
      }
      const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
      const fileName = `급여청구서_${monthKey}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: '급여 청구서', files: [file] })
      } else {
        downloadBlob(blob, fileName)
      }
    } catch {
      alert('이미지 생성 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }, [currentYear, currentMonth])

  // 계산: 급여명세서 수치
  const paystubGross = selectedPayStub?.grossPay ?? selectedPayStub?.baseTotal ?? 0
  const paystubDeductions =
    selectedPayStub?.deductions ??
    (selectedPayStub?.netPay != null
      ? Math.max(0, paystubGross - selectedPayStub.netPay)
      : Math.floor(paystubGross * DEDUCTION_RATE))
  const paystubNet = selectedPayStub?.netPay ?? Math.max(0, paystubGross - paystubDeductions)

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[var(--color-text-sub)]">데이터 로딩 중...</div>
      </div>
    )
  }

  return (
    <div>
      {/* 상단: 탭 전환 + 관리자 탭 */}
      <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
        {(['output', 'salary'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 h-12 text-[15px] font-semibold border-b-[3px] transition-all ${
              activeTab === tab
                ? 'text-[var(--color-primary-strong)] border-b-[var(--color-primary-strong)] font-bold'
                : 'text-[var(--color-text-sub)] border-b-transparent'
            }`}
          >
            {tab === 'output' ? '출역현황' : '급여내역'}
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 h-12 text-[15px] font-semibold border-b-[3px] transition-all ${
              activeTab === 'admin'
                ? 'text-[var(--color-primary-strong)] border-b-[var(--color-primary-strong)] font-bold'
                : 'text-[var(--color-text-sub)] border-b-transparent'
            }`}
          >
            관리자
          </button>
        )}
      </div>

      {/* 출역현황 탭 콘텐츠 */}
      {activeTab === 'output' && (
        <div className="p-4 space-y-4">
          {/* 현장 필터 + 월 선택기 */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* 현장 필터 */}
            <div className="relative flex-1 sm:min-w-[200px]">
              <select
                value={filterSite}
                onChange={e => setFilterSite(e.target.value)}
                className="w-full h-[48px] px-3 rounded-xl border border-[var(--form-border)] bg-[var(--form-surface)] text-[14px] font-medium text-[var(--color-text-main)] appearance-none cursor-pointer focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
              >
                <option value="">전체 현장</option>
                {siteFilterOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-sub)] pointer-events-none" />
            </div>

            {/* 월 선택기 */}
            <div className="relative sm:w-auto">
              <button
                onClick={() => { setPickerYear(currentYear); setShowMonthPicker(!showMonthPicker) }}
                className={`flex h-[48px] items-center gap-2 rounded-xl border px-4 text-[15px] font-semibold transition-all ${
                  showMonthPicker
                    ? 'border-[var(--color-accent)] shadow-[0_0_0_3px_rgba(137,207,235,0.15)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                }`}
              >
                <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
                {String(currentYear).slice(-2)}년 {currentMonth}월
              </button>

              {showMonthPicker && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[calc(100vw-2rem)] max-w-[260px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 shadow-lg sm:left-auto sm:right-0">
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setPickerYear(y => y - 1)} className="p-1 hover:bg-[var(--color-bg)] rounded-lg">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-bold">{pickerYear}년</span>
                    <button onClick={() => setPickerYear(y => y + 1)} className="p-1 hover:bg-[var(--color-bg)] rounded-lg">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <button
                        key={m}
                        onClick={() => {
                          setCurrentYear(pickerYear)
                          setCurrentMonth(m)
                          setShowMonthPicker(false)
                        }}
                        className={`h-10 rounded-xl text-[14px] font-semibold transition-all ${
                          pickerYear === currentYear && m === currentMonth
                            ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)] font-bold'
                            : 'hover:bg-[var(--color-bg)] text-[var(--color-text-sub)]'
                        }`}
                      >
                        {m}월
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 캘린더 */}
          <div className="ui-calendar">
            {/* 캘린더 헤더: 월 이동 */}
            <div className="ui-calendar__header">
              <div className="flex items-center justify-between">
                <button onClick={() => changeMonth(-1)} className="ui-month-mover__btn">
                  <ChevronLeft />
                </button>
                <span className="ui-month-mover__title">
                  {currentYear}년 {currentMonth}월
                </span>
                <button onClick={() => changeMonth(1)} className="ui-month-mover__btn">
                  <ChevronRight />
                </button>
              </div>
            </div>

            {/* 캘린더 그리드 */}
            <div className="ui-calendar__grid">
              {/* 요일 헤더 */}
              {WEEK_DAYS.map((d, i) => (
                <div
                  key={d}
                  className={`ui-calendar__weekday ${
                    i === 0 ? 'is-sun' : i === 6 ? 'is-sat' : ''
                  }`}
                >
                  {d}
                </div>
              ))}

              {/* 빈 셀 (이전 달) */}
              {Array.from({ length: calendarData.firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="ui-date-cell is-disabled" />
              ))}

              {/* 날짜 셀 */}
              {calendarData.cells.map(cell => {
                const dayOfWeek = (calendarData.firstDay + cell.day - 1) % 7
                const totalMan = cell.entries.reduce((s, e) => s + e.man, 0)
                const totalPrice = cell.entries.reduce((s, e) => s + e.price, 0)

                return (
                  <div
                    key={cell.day}
                    className={`ui-date-cell ${
                      dayOfWeek === 0 ? 'is-sun' : dayOfWeek === 6 ? 'is-sat' : ''
                    }`}
                    onClick={() => cell.entries.length > 0 && setEditModal({
                      date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`,
                      entries: cell.entries,
                    })}
                  >
                    <button className="ui-date-cell__button">
                      <span className="ui-date-cell__day">{cell.day}</span>
                      {cell.entries.length > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className="ui-date-cell__meta">{totalMan.toFixed(1)}</span>
                          <span className="ui-date-cell__meta" style={{ color: 'var(--color-accent-strong)', fontWeight: 700 }}>
                            {(totalPrice / 10000).toFixed(0)}만
                          </span>
                          {cell.entries.length === 1 && (
                            <span className="ui-date-cell__meta">{compactSiteLabel(cell.entries[0].site ?? '')}</span>
                          )}
                        </div>
                      ) : (
                        <span className="ui-date-cell__meta" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 요약 통계 카드 */}
          <div className="ui-field-grid">
            {[
              { value: summaryStats.totalSites, label: '총 현장수' },
              { value: summaryStats.totalMan.toFixed(1), label: '근무' },
              { value: summaryStats.workedDays, label: '일수' },
            ].map(({ value, label }) => (
              <div key={label} className="ui-field-box">
                <div className="ui-field-box__label">{label}</div>
                <div className="ui-field-box__value ui-type-number">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 급여내역 탭 콘텐츠 */}
      {activeTab === 'salary' && !isPartnerUser && (
        <div className="p-4 space-y-4">
          {/* 월별 급여 요약 */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--color-primary-strong)]" />
              <span className="text-[18px] font-bold text-[var(--color-navy)]">이번 달 급여 요약</span>
            </div>
            <button
              onClick={() => setIsPrivacyOn(!isPrivacyOn)}
              className="flex items-center gap-1 text-[13px] font-semibold text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] transition"
            >
              <span>금액 숨기기/표시</span>
              {isPrivacyOn ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* 이번 달 급여 카드 */}
          <div className="bg-[var(--color-bg-surface)] rounded-2xl p-5 shadow-sm border border-[var(--color-border)]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[16px] font-bold text-[var(--color-text-main)]">
                {currentYear}년 {currentMonth}월
              </span>
              <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-info)] border border-[var(--color-accent-soft-3)]">
                예상 금액
              </span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-dashed border-[var(--color-border)] mb-2">
              <span className="font-semibold text-[var(--color-text-main)]">청구 총 금액</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[22px] font-bold text-[var(--color-accent-strong)]">
                  {isPrivacyOn ? '****' : formatCurrency(currentSalary.netPay)}
                </span>
                <span className="text-[13px] font-semibold text-[var(--color-accent-strong)]">원</span>
              </div>
            </div>

            <div className="flex justify-between text-[14px] mb-1.5">
              <span className="font-semibold text-[var(--color-text-sub)]">일수</span>
              <span className="font-semibold text-[var(--color-text-main)]">{currentSalary.man.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-[14px] mb-3">
              <span className="font-semibold text-[var(--color-text-sub)]">일당(3.3%공제)</span>
              <span className="font-semibold text-[var(--color-text-main)]">
                {isPrivacyOn ? '****' : dailyRate > 0 ? `${formatCurrency(dailyRate)}원` : '-'}
              </span>
            </div>

            <button
              onClick={handlePaymentRequest}
              className="w-full h-[48px] rounded-xl bg-[var(--color-navy)] text-white font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-[var(--color-primary-hover)] transition active:scale-[0.98]"
            >
              <Share className="w-4 h-4" />
              급여 청구서 (공유)
            </button>
          </div>

          {/* 급여 히스토리 섹션 */}
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary-strong)]" />
            <span className="text-[18px] font-bold text-[var(--color-navy)]">급여 내역 이력</span>
          </div>

          {/* 필터: 연도/월 선택 */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <button
                onClick={() => { setSalPickerYear(salFilterYear); setShowSalDatePicker(!showSalDatePicker) }}
                className={`flex items-center justify-between w-full h-[48px] px-4 rounded-xl border text-[15px] font-semibold cursor-pointer transition-all ${
                  showSalDatePicker ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                }`}
              >
                <span>
                  {salFilterYear}년 {salFilterMonth !== null ? `${salFilterMonth}월` : '전체'}
                </span>
                <Calendar className="w-4 h-4 text-[var(--color-text-sub)]" />
              </button>

              {showSalDatePicker && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[calc(100vw-2rem)] max-w-[260px] animate-fade-in rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 shadow-lg sm:w-[260px]">
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setSalPickerYear(y => y - 1)} className="p-1 hover:bg-[var(--color-bg)] rounded-lg">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-bold">{salPickerYear}년</span>
                    <button onClick={() => setSalPickerYear(y => y + 1)} className="p-1 hover:bg-[var(--color-bg)] rounded-lg">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <button
                        key={m}
                        onClick={() => { setSalFilterYear(salPickerYear); setSalFilterMonth(m); setShowSalDatePicker(false) }}
                        className={`h-10 rounded-xl text-[14px] font-semibold transition-all ${
                          salFilterYear === salPickerYear && salFilterMonth === m
                            ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)] font-bold'
                            : 'hover:bg-[var(--color-bg)] text-[var(--color-text-sub)]'
                        }`}
                      >
                        {m}월
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <button
                      onClick={() => { setSalFilterYear(salPickerYear); setSalFilterMonth(null); setShowSalDatePicker(false) }}
                      className="w-full h-10 rounded-xl text-[14px] font-semibold text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] transition border-none bg-transparent"
                    >
                      해당 연도 전체 보기
                    </button>
                  </div>
                </div>
              )}
            </div>

            <select
              value={salSortFilter}
              onChange={e => setSalSortFilter(e.target.value)}
              className="h-[48px] px-3 rounded-xl border border-[var(--form-border)] bg-[var(--form-surface)] text-[15px] font-semibold appearance-none cursor-pointer focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
            >
              <option value="latest">최신순</option>
              <option value="amount">금액순</option>
            </select>
          </div>

          {/* 급여 히스토리 카드 리스트 */}
          <div className="space-y-3">
            {displayedSalary.map(sal => (
              <div
                key={sal.rawDate}
                onClick={() => openPayStub(sal)}
                className="bg-[var(--color-bg-surface)] rounded-2xl p-5 shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-[0.99] border border-[var(--color-border)]"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[16px] font-bold text-[var(--color-text-main)]">{sal.month}</span>
                  <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                    확정
                  </span>
                </div>
                <div className="flex justify-between pb-2.5 border-b border-dashed border-[var(--color-border)] mb-2">
                  <span className="font-semibold text-[var(--color-text-main)]">실수령액</span>
                  <span className="text-[18px] font-bold text-[var(--color-accent-strong)]">
                    {isPrivacyOn ? '****' : `${formatCurrency(sal.netPay)}원`}
                  </span>
                </div>
                <div className="flex justify-between text-[14px] text-[var(--color-text-sub)]">
                  <span>
                    일수 <strong className="text-[var(--color-text-main)]">{sal.man.toFixed(1)}</strong>
                  </span>
                  <span>
                    총액 <strong className="text-[var(--color-text-main)]">{isPrivacyOn ? '****' : `${formatCurrency(sal.baseTotal)}원`}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredSalary.length > 3 && (
            <button
              onClick={() => setSalHistoryExpanded(!salHistoryExpanded)}
              className="w-full h-[48px] bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-full text-[14px] font-semibold text-[var(--color-text-sub)] flex items-center justify-center gap-1.5 transition-all hover:bg-[var(--color-bg)]"
            >
              {salHistoryExpanded ? '접기' : '더 보기'}
              <ChevronDown className={`w-4 h-4 transition-transform ${salHistoryExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}

      {/* 일별 상세 수정 모달 */}
      {editModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-5"
          onClick={() => setEditModal(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-[500px] overflow-y-auto rounded-[20px] bg-[var(--color-bg-surface)] p-5 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-[18px] font-bold text-[var(--color-text-main)]">일별 근무 상세</span>
              <button onClick={() => setEditModal(null)} className="p-1 hover:bg-[var(--color-bg)] rounded-full transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="text-[13px] text-[var(--color-text-sub)] mb-3">{editModal.date}</div>
            <div>
              {editModal.entries.map((entry, i) => (
                <div key={i} className="flex justify-between items-start py-3 border-b border-[var(--color-border)] gap-3">
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--color-text-sub)]">{entry.site}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-semibold text-[var(--color-text-main)]">{entry.man}일</div>
                    <div className="text-[14px] font-semibold text-[var(--color-accent-strong)]">
                      {formatCurrency(entry.price)}원
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 급여명세서 모달 */}
      {isPayStubOpen && selectedPayStub && (
        <div className="fixed inset-0 bg-[var(--color-bg-surface)] z-[2000] flex flex-col">
          <div className="h-[56px] px-4 flex items-center justify-between shrink-0 border-b border-[var(--color-border)]">
            <button onClick={() => setIsPayStubOpen(false)} className="p-1 hover:bg-[var(--color-bg)] rounded-full transition">
              <X className="w-6 h-6" />
            </button>
            <span className="text-[16px] font-bold text-[var(--color-text-main)]">급여명세서 미리보기</span>
            <div className="w-6" />
          </div>

          <div className="flex-1 p-5 overflow-y-auto pb-10">
            {/* 화면용 명세서 */}
            <div
              ref={paystubRef}
              className="w-full max-w-[480px] bg-[var(--color-bg-surface)] rounded-2xl shadow-lg p-8 mx-auto"
            >
              <PayStubContent
                stub={selectedPayStub}
                workerName={workerDisplayName}
                workerAffiliation={workerAffiliation}
                paystubGross={paystubGross}
                paystubDeductions={paystubDeductions}
                paystubNet={paystubNet}
              />
            </div>

            {/* PDF 다운로드 버튼 */}
            <button
              onClick={downloadPayStubPDF}
              className="mt-4 w-full max-w-[480px] mx-auto bg-[var(--color-navy)] text-white font-bold rounded-xl h-[48px] flex items-center justify-center gap-2 transition active:scale-95 shadow-lg"
            >
              <Download className="w-5 h-5" />
              PDF 다운로드
            </button>

            {/* A4용 명세서 (PDF 전용, 화면 숨김) */}
            <div
              ref={paystubPdfRef}
              className="fixed left-[0px] top-[0px]"
              style={{ left: OFFSCREEN_LEFT, width: A4_WIDTH_PX }}
            >
              <div className="p-[48px] bg-[var(--color-bg-surface)]" style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
                <PayStubContent
                  stub={selectedPayStub}
                  workerName={workerDisplayName}
                  workerAffiliation={workerAffiliation}
                  paystubGross={paystubGross}
                  paystubDeductions={paystubDeductions}
                  paystubNet={paystubNet}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 급여청구서 (화면 렌더링 전용, 공유 시 offscreen 사용) */}
      <div
        ref={payRequestRef}
        className="fixed"
        style={{ left: OFFSCREEN_LEFT, top: 0, width: A4_WIDTH_PX }}
      >
        <div
          className="p-[48px] bg-[var(--color-bg-surface)]"
          style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif", minHeight: '100vh' }}
        >
          <PayRequestContent
            year={currentYear}
            month={currentMonth}
            shareTotals={shareTotals}
            shareCalendarCells={shareCalendarCells}
            workerDisplayName={workerDisplayName}
          />
        </div>
      </div>
    </div>
  )
}
