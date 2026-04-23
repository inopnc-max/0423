'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { hideSalary } from '@/lib/roles'

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

export default function OutputPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [logs, setLogs] = useState<DailyLog[]>([])
  const [salary, setSalary] = useState<SalaryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

  const isPartnerUser = user ? hideSalary(user.role) : false

  useEffect(() => {
    if (!user) return
    const currentUser = user

    async function fetchData() {
      try {
        const [logsResponse, salaryResponse] = await Promise.all([
          supabase
            .from('daily_logs')
            .select('id, site_id, work_date, status, worker_array, task_tags, site_info')
            .eq('user_id', currentUser.userId)
            .order('work_date', { ascending: false })
            .limit(30),
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
          setLogs(logsResponse.data)
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
  }, [isPartnerUser, selectedMonth, selectedYear, supabase, user])

  const totalMan = logs.reduce((sum, log) => {
    const logTotal = log.worker_array?.reduce((acc, worker) => acc + (worker.count || 0), 0) || 0
    return sum + logTotal
  }, 0)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-navy)]">출역</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          출역 현황과 급여 요약을 역할별로 확인할 수 있습니다.
        </p>
      </div>

      {!isPartnerUser && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-navy)]">급여 현황</h2>
          </div>

          <div className="mb-3 flex gap-3">
            <select
              value={selectedYear}
              onChange={event => setSelectedYear(Number(event.target.value))}
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={event => setSelectedMonth(Number(event.target.value))}
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ))}
            </select>
          </div>

          {salary ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-blue-50 p-3">
                <div className="text-xs text-blue-600">일당</div>
                <div className="mt-1 text-lg font-bold text-blue-700">{salary.daily_rate.toLocaleString()}원</div>
              </div>
              <div className="rounded-xl bg-green-50 p-3">
                <div className="text-xs text-green-600">총 공수</div>
                <div className="mt-1 text-lg font-bold text-green-700">{salary.man}공수</div>
              </div>
              <div className="col-span-2 rounded-xl bg-[var(--color-navy)] p-3 text-white">
                <div className="text-xs text-white/70">실수령액</div>
                <div className="mt-1 text-xl font-bold">{salary.net_pay.toLocaleString()}원</div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-[var(--color-bg)] px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
              등록된 급여 데이터가 없습니다.
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-[var(--color-navy)]">출역 요약</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--color-navy)]">{logs.length}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">작업일</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--color-accent)]">{totalMan}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">총 인원</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {logs.filter(log => log.status === 'approved').length}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">승인완료</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-[var(--color-navy)]">최근 출역 기록</h2>
        {logs.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-[var(--color-text-secondary)] shadow-sm">
            출역 기록이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
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

                {log.task_tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {log.task_tags.map(tag => (
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
      </section>
    </div>
  )
}
