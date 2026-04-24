'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { History, Search, Filter, ChevronDown, ChevronUp, Download } from 'lucide-react'

interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name: string
  record_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
  user_name?: string
  user_email?: string
}

type AuditLogRow = Omit<AuditLog, 'user_name' | 'user_email'> & {
  worker?: { name?: string; email?: string } | Array<{ name?: string; email?: string }> | null
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  INSERT:     { label: '생성',   color: 'text-green-700', bg: 'bg-green-50' },
  UPDATE:     { label: '수정',   color: 'text-blue-700', bg: 'bg-blue-50' },
  DELETE:     { label: '삭제',   color: 'text-red-700', bg: 'bg-red-50' },
  CSV_UPLOAD: { label: 'CSV업로드', color: 'text-purple-700', bg: 'bg-purple-50' },
  LOGIN:      { label: '로그인', color: 'text-gray-700', bg: 'bg-gray-50' },
  LOGOUT:     { label: '로그아웃', color: 'text-gray-600', bg: 'bg-gray-50' },
  APPROVE:    { label: '승인',   color: 'text-green-700', bg: 'bg-green-50' },
  REJECT:     { label: '반려',   color: 'text-red-700', bg: 'bg-red-50' },
}

const TABLE_LABELS: Record<string, string> = {
  workers:       '작업자',
  sites:         '현장',
  daily_logs:    '일지',
  documents:     '문서',
  materials:     '자재',
  material_logs: '자재로그',
  notifications: '알림',
  salary_entries:'급여',
  hq_requests:   '본사요청',
  audit_logs:    '감사로고',
}

function diffValue(oldVal: unknown, newVal: unknown): { label: string; from: string; to: string } | null {
  if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null
  return {
    label: '',
    from: typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? ''),
    to: typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? ''),
  }
}

function computeDiff(oldObj: Record<string, unknown> | null, newObj: Record<string, unknown> | null): Array<{ key: string; from: string; to: string }> {
  const diffs: Array<{ key: string; from: string; to: string }> = []
  if (!oldObj && !newObj) return diffs
  const keys = Array.from(new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]))
  for (const key of keys) {
    const from = oldObj?.[key]
    const to = newObj?.[key]
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      diffs.push({
        key,
        from: typeof from === 'object' ? JSON.stringify(from) : String(from ?? ''),
        to: typeof to === 'object' ? JSON.stringify(to) : String(to ?? ''),
      })
    }
  }
  return diffs
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tableFilter, setTableFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50
  const supabase = createClient()

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('audit_logs').select(`
      id, user_id, action, table_name, record_id, old_value, new_value, created_at,
      worker:workers(name, email)
    `).order('created_at', { ascending: false }).limit(300)

    const { data, error } = await query
    if (!error && data) {
      const mappedLogs: AuditLog[] = (data as AuditLogRow[]).map(log => {
        const worker = Array.isArray(log.worker) ? log.worker[0] : log.worker

        return {
          id: log.id,
          user_id: log.user_id,
          action: log.action,
          table_name: log.table_name,
          record_id: log.record_id,
          old_value: log.old_value,
          new_value: log.new_value,
          created_at: log.created_at,
          user_name: worker?.name,
          user_email: worker?.email,
        }
      })

      setLogs(mappedLogs)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const filtered = logs.filter(l => {
    if (tableFilter !== 'all' && l.table_name !== tableFilter) return false
    if (actionFilter !== 'all' && l.action !== actionFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        l.user_name?.toLowerCase().includes(q) ||
        l.user_email?.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.table_name.toLowerCase().includes(q) ||
        l.record_id?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const uniqueTables = Array.from(new Set(logs.map(l => l.table_name))).sort()
  const uniqueActions = Array.from(new Set(logs.map(l => l.action))).sort()

  const handleExport = useCallback(() => {
    const headers = ['시간', '사용자', '이메일', '작업', '테이블', '대상ID', '변경전', '변경후']
    const rows = filtered.map(l => [
      new Date(l.created_at).toLocaleString('ko-KR'),
      l.user_name || '',
      l.user_email || '',
      l.action,
      l.table_name,
      l.record_id || '',
      l.old_value ? JSON.stringify(l.old_value) : '',
      l.new_value ? JSON.stringify(l.new_value) : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `감사로고_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filtered])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)]">감사로그</h1>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
        >
          <Download className="h-4 w-4" strokeWidth={1.9} />
          CSV 내보내기
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.9} />
          <input
            type="text"
            placeholder="사용자, 작업, 테이블 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <select
          value={tableFilter}
          onChange={e => setTableFilter(e.target.value)}
          className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
        >
          <option value="all">전체 테이블</option>
          {uniqueTables.map(t => (
            <option key={t} value={t}>{TABLE_LABELS[t] || t}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
        >
          <option value="all">전체 작업</option>
          {uniqueActions.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a]?.label || a}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="text-sm text-[var(--color-text-secondary)] mb-4">
        총 {filtered.length.toLocaleString()}건 {totalPages > 1 && `(페이지 ${page + 1} / ${totalPages})`}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">로딩 중...</div>
      ) : paged.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">감사로그가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {paged.map(log => {
            const actionCfg = ACTION_LABELS[log.action] || { label: log.action, color: 'text-gray-700', bg: 'bg-gray-50' }
            const isExpanded = expandedId === log.id
            const diffs = computeDiff(log.old_value, log.new_value)

            return (
              <div key={log.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition text-left"
                >
                  <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${actionCfg.bg} ${actionCfg.color}`}>
                    {actionCfg.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-[var(--color-text-secondary)]">{log.user_name || log.user_email || log.user_id.slice(0, 8)}</span>
                      <span className="text-[var(--color-text-tertiary)]">
                        {TABLE_LABELS[log.table_name] || log.table_name}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)] flex-shrink-0">
                    {new Date(log.created_at).toLocaleString('ko-KR')}
                  </div>
                  <div className="text-[var(--color-text-tertiary)] flex-shrink-0">
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4" strokeWidth={1.9} />
                      : <ChevronDown className="h-4 w-4" strokeWidth={1.9} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-[var(--color-border)] pt-4 space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[var(--color-text-tertiary)]">사용자</span>
                        <p className="font-medium mt-0.5">{log.user_name || '-'}</p>
                        <p className="text-[var(--color-text-secondary)]">{log.user_email || '-'}</p>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-tertiary)]">테이블</span>
                        <p className="font-medium mt-0.5">{TABLE_LABELS[log.table_name] || log.table_name}</p>
                        <p className="text-[var(--color-text-secondary)]">{log.table_name}</p>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-tertiary)]">대상 ID</span>
                        <p className="font-medium mt-0.5 text-xs break-all">{log.record_id || '-'}</p>
                      </div>
                    </div>

                    {diffs.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">변경 내용</p>
                        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-500">필드</th>
                                <th className="px-3 py-2 text-left font-medium text-red-500">변경전</th>
                                <th className="px-3 py-2 text-left font-medium text-green-500">변경후</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {diffs.map(d => (
                                <tr key={d.key}>
                                  <td className="px-3 py-2 font-medium text-gray-600">{d.key}</td>
                                  <td className="px-3 py-2 text-red-600 break-all">{d.from || '(없음)'}</td>
                                  <td className="px-3 py-2 text-green-600 break-all">{d.to || '(없음)'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {(log.old_value === null && log.new_value === null) && (
                      <p className="text-xs text-[var(--color-text-tertiary)]">변경 내용 없음 (메타데이터 로그)</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
