'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wallet, Calendar, ChevronLeft, ChevronRight, Search, Download, TrendingUp } from 'lucide-react'
import type { Role } from '@/lib/roles'
import { ROLE_LABELS } from '@/lib/roles'

interface SalaryEntry {
  id: string
  user_id: string
  year: number
  month: number
  man: number
  daily_rate: number
  gross_pay: number
  deduction: number
  net_pay: number
  status: string
  worklog_ids: string[]
  created_at: string
  worker_name?: string
  worker_email?: string
  worker_company?: string
  worker_role?: string
}

interface Worker {
  id: string
  name: string
  email: string
  company: string
  role: string
  daily: number
}

interface Site { id: string; name: string }

export default function AdminPayrollPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [entries, setEntries] = useState<SalaryEntry[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<SalaryEntry>>({})
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: entriesData, error }, { data: workersData }, { data: sitesData }] = await Promise.all([
      supabase.from('salary_entries')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .order('created_at', { ascending: false }),
      supabase.from('workers').select('id, name, email, company, role, daily').order('name'),
      supabase.from('sites').select('id, name').order('name'),
    ])

    if (!error && entriesData) {
      const workersMap = new Map(workersData?.map(w => [w.id, w]) || [])
      const entriesMapped: SalaryEntry[] = entriesData.map(e => {
        const w = workersMap.get(e.user_id)
        return {
          ...e,
          worker_name: w?.name,
          worker_email: w?.email,
          worker_company: w?.company,
          worker_role: w?.role,
        }
      })
      setEntries(entriesMapped)
    }
    if (workersData) setWorkers(workersData)
    if (sitesData) setSites(sitesData)
    setLoading(false)
  }, [year, month, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const companies = Array.from(new Set(workers.map(w => w.company).filter(Boolean)))

  const filtered = entries.filter(e => {
    if (companyFilter !== 'all' && e.worker_company !== companyFilter) return false
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        e.worker_name?.toLowerCase().includes(q) ||
        e.worker_email?.toLowerCase().includes(q) ||
        e.worker_company?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const totalMan = filtered.reduce((s, e) => s + (e.man || 0), 0)
  const totalGross = filtered.reduce((s, e) => s + (e.gross_pay || 0), 0)
  const totalNet = filtered.reduce((s, e) => s + (e.net_pay || 0), 0)

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const handleAutoGenerate = useCallback(async () => {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

    const { data: worklogs } = await supabase
      .from('daily_logs')
      .select('user_id, site_info, work_date')
      .gte('work_date', startDate)
      .lt('work_date', endDate)
      .eq('status', 'approved')

    const grouped = new Map<string, { man: number; daily_rate: number }>()
    const { data: allWorkers } = await supabase.from('workers').select('id, daily')
    const dailyMap = new Map(allWorkers?.map(w => [w.id, w.daily || 150000]) || [])

    for (const w of (worklogs || [])) {
      const existing = grouped.get(w.user_id)
      if (existing) {
        existing.man += 1
      } else {
        grouped.set(w.user_id, { man: 1, daily_rate: dailyMap.get(w.user_id) || 150000 })
      }
    }

    const upserts = Array.from(grouped.entries()).map(([userId, { man, daily_rate }]) => ({
      user_id: userId,
      year,
      month,
      man,
      daily_rate,
      gross_pay: man * daily_rate,
      deduction: Math.round(man * daily_rate * 0.045),
      net_pay: Math.round(man * daily_rate * 0.955),
      status: 'draft',
    }))

    for (const entry of upserts) {
      await supabase.from('salary_entries').upsert(entry, { onConflict: 'user_id,year,month' })
    }

    await fetchData()
  }, [year, month, supabase, fetchData])

  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return
    await supabase.from('salary_entries').update({
      man: editData.man,
      daily_rate: editData.daily_rate,
      gross_pay: (editData.man || 0) * (editData.daily_rate || 0),
      deduction: Math.round((editData.man || 0) * (editData.daily_rate || 0) * 0.045),
      net_pay: Math.round((editData.man || 0) * (editData.daily_rate || 0) * 0.955),
    }).eq('id', editingId)
    setEditingId(null)
    await fetchData()
  }, [editingId, editData, supabase, fetchData])

  const handleExportCSV = useCallback(() => {
    const headers = ['이름', '이메일', '회사', '역할', '공수', '일당', '총액', '공제', '실수령', '상태']
    const rows = filtered.map(e => [
      e.worker_name || '',
      e.worker_email || '',
      e.worker_company || '',
      ROLE_LABELS[e.worker_role as Role] || e.worker_role || '',
      e.man || 0,
      e.daily_rate || 0,
      e.gross_pay || 0,
      e.deduction || 0,
      e.net_pay || 0,
      e.status === 'draft' ? '임시' : e.status === 'approved' ? '확정' : e.status,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `급여_${year}_${month.toString().padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filtered, year, month])

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    approved: 'bg-green-100 text-green-700',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)]">출역/급여</h1>
        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
        >
          <Download className="h-4 w-4" strokeWidth={1.9} />
          CSV 내보내기
        </button>
      </div>

      {/* Month Navigator */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center justify-center gap-6">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronLeft className="h-5 w-5" strokeWidth={1.9} />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--color-navy)]" strokeWidth={1.9} />
            <span className="text-lg font-semibold text-[var(--color-navy)]">{year}년 {month}월</span>
          </div>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronRight className="h-5 w-5" strokeWidth={1.9} />
          </button>
          <div className="border-l border-[var(--color-border)] pl-4 ml-2">
            <button
              onClick={handleAutoGenerate}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? '생성 중...' : '급여 자동 생성'}
            </button>
          </div>
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--color-border)]">
            <div className="text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">총 공수</p>
              <p className="text-lg font-bold text-[var(--color-navy)]">{totalMan.toLocaleString()} 공수</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">총 급여</p>
              <p className="text-lg font-bold text-[var(--color-navy)]">{totalGross.toLocaleString()}원</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">실수령 합계</p>
              <p className="text-lg font-bold text-green-600">{totalNet.toLocaleString()}원</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.9} />
          <input
            type="text"
            placeholder="이름, 이메일, 회사 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <select
          value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value)}
          className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
        >
          <option value="all">전체 회사</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
        >
          <option value="all">전체 상태</option>
          <option value="draft">임시저장</option>
          <option value="approved">확정</option>
        </select>
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-4">급여 수정</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">공수 (man)</label>
                <input type="number" value={editData.man ?? 0} onChange={e => setEditData(d => ({ ...d, man: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">일당</label>
                <input type="number" value={editData.daily_rate ?? 0} onChange={e => setEditData(d => ({ ...d, daily_rate: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] text-right">
                예상 실수령: {((editData.man || 0) * (editData.daily_rate || 0) * 0.955).toLocaleString()}원
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingId(null)} className="flex-1 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-gray-50">취소</button>
              <button onClick={handleSaveEdit} className="flex-1 py-2 bg-[var(--color-navy)] text-white rounded-lg hover:bg-[var(--color-navy-hover)]">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">회사</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">공수</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">일당</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">총액</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">공제</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">실수령</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">수정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">로딩 중...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">해당 월 급여 데이터가 없습니다.</td>
                </tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{e.worker_name || e.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">{e.worker_email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.worker_company || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{e.man}</td>
                  <td className="px-4 py-3 text-sm text-right">{e.daily_rate?.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{e.gross_pay?.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-sm text-right text-red-500">-{e.deduction?.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-green-600">{e.net_pay?.toLocaleString()}원</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[e.status] || 'bg-gray-100 text-gray-600'}`}>
                      {e.status === 'draft' ? '임시' : e.status === 'approved' ? '확정' : e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setEditingId(e.id); setEditData({ man: e.man, daily_rate: e.daily_rate }); }}
                      className="text-xs text-[var(--color-accent)] hover:underline"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
