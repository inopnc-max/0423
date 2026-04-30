'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Calendar, CheckCircle, XCircle, Clock, Search, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useSelectedSite } from '@/contexts/selected-site-context'
import { ApprovalReviewTimeline, ApprovalSummary } from '@/components/site-manager/SiteManagerApprovalPanel'
import { useSiteManagerDashboard } from '@/hooks/site-manager/useSiteManagerDashboard'

type WorklogStatus = 'draft' | 'pending' | 'approved' | 'rejected'

interface Worklog {
  id: string
  site_id: string
  work_date: string
  user_id: string
  status: WorklogStatus
  rejection_reason: string | null
  rejected_at: string | null
  approved_at: string | null
  created_at: string
  site_name?: string
  user_name?: string
  worker_count: number
  total_man: number
}

interface Site { id: string; name: string }
interface Worker { id: string; name: string }

type WorklogRow = Omit<Worklog, 'site_name' | 'user_name' | 'worker_count' | 'total_man'> & {
  worker_array?: Array<{ man?: number }> | null
  site?: { name?: string } | Array<{ name?: string }> | null
  worker?: { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null
}

const STATUS_CONFIG: Record<WorklogStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  draft:     { label: '임시저장',   color: 'text-gray-600',   bg: 'bg-gray-100',   icon: Clock },
  pending:   { label: '승인대기',   color: 'text-yellow-700', bg: 'bg-yellow-50',  icon: Clock },
  approved:  { label: '승인완료',   color: 'text-green-700',  bg: 'bg-green-50',   icon: CheckCircle },
  rejected:  { label: '반려',       color: 'text-red-700',    bg: 'bg-red-50',     icon: XCircle },
}

export default function AdminWorklogsPage() {
  const { user } = useAuth()
  const { selectedSiteId } = useSelectedSite()
  const [worklogs, setWorklogs] = useState<Worklog[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<WorklogStatus | 'all'>('pending')
  const [siteFilter, setSiteFilter] = useState<string>('all')
  const [sites, setSites] = useState<Site[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [search, setSearch] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)
  const isSiteManagerUser = user?.role === 'site_manager'
  const siteManagerDashboard = useSiteManagerDashboard({
    managerId: isSiteManagerUser ? user?.userId : null,
    managerName: user?.profile?.name,
    siteId: isSiteManagerUser ? selectedSiteId : null,
    workDate: today,
  })

  useEffect(() => {
    Promise.all([
      supabase.from('daily_logs').select(`
        id, site_id, work_date, user_id, status, rejection_reason,
        rejected_at, approved_at, created_at, worker_array,
        site:sites(name),
        worker:workers(id,name)
      `).order('created_at', { ascending: false }).limit(200),
      supabase.from('sites').select('id, name').order('name'),
      supabase.from('workers').select('id, name').order('name'),
    ]).then(([logsRes, sitesRes, workersRes]) => {
      if (!logsRes.error && logsRes.data) {
        const mapped: Worklog[] = (logsRes.data as WorklogRow[]).map(log => {
          const site = Array.isArray(log.site) ? log.site[0] : log.site
          const worker = Array.isArray(log.worker) ? log.worker[0] : log.worker
          const workerArray = Array.isArray(log.worker_array) ? log.worker_array : []

          return {
            id: log.id,
            site_id: log.site_id,
            work_date: log.work_date,
            user_id: log.user_id,
            status: log.status,
            rejection_reason: log.rejection_reason,
            rejected_at: log.rejected_at,
            approved_at: log.approved_at,
            created_at: log.created_at,
            site_name: site?.name,
            user_name: worker?.name,
            worker_count: workerArray.length,
            total_man: workerArray.reduce((sum, item) => sum + (item.man || 0), 0),
          }
        })
        setWorklogs(mapped)
      }
      if (!sitesRes.error && sitesRes.data) setSites(sitesRes.data)
      if (!workersRes.error && workersRes.data) setWorkers(workersRes.data)
      setLoading(false)
    })
  }, [supabase])

  const handleApprove = useCallback(async (id: string) => {
    setActionLoading(id)
    const { error } = await supabase
      .from('daily_logs')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setWorklogs(prev => prev.map(w => w.id === id ? { ...w, status: 'approved' as WorklogStatus } : w))
    }
    setActionLoading(null)
  }, [supabase])

  const handleReject = useCallback(async (id: string) => {
    if (!rejectReason.trim()) return
    setActionLoading(id)
    const { error } = await supabase
      .from('daily_logs')
      .update({ status: 'rejected', rejection_reason: rejectReason, rejected_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setWorklogs(prev => prev.map(w => w.id === id ? { ...w, status: 'rejected' as WorklogStatus, rejection_reason: rejectReason } : w))
      await supabase.from('notifications').insert({
        user_id: worklogs.find(w => w.id === id)?.user_id,
        type: 'worklog_rejected',
        title: '일지가 반려되었습니다',
        body: rejectReason,
        href: `/worklog`,
      })
    }
    setActionLoading(null)
    setRejectingId(null)
    setRejectReason('')
  }, [rejectReason, supabase, worklogs])

  const filtered = worklogs.filter(w => {
    if (statusFilter !== 'all' && w.status !== statusFilter) return false
    if (siteFilter !== 'all' && w.site_id !== siteFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!w.site_name?.toLowerCase().includes(q) && !w.user_name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const counts: Record<WorklogStatus, number> = { draft: 0, pending: 0, approved: 0, rejected: 0 }
  worklogs.forEach(w => { counts[w.status]++ })

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">일지 승인</h1>

      {isSiteManagerUser && (
        <>
          {siteManagerDashboard.message && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              siteManagerDashboard.message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {siteManagerDashboard.message.text}
            </div>
          )}
          <ApprovalSummary
            summary={siteManagerDashboard.summary}
            loading={siteManagerDashboard.loading}
          />
          <ApprovalReviewTimeline
            logs={siteManagerDashboard.logs}
            loading={siteManagerDashboard.loading}
            submitting={siteManagerDashboard.submitting}
            onApprove={siteManagerDashboard.approveLog}
            onReject={siteManagerDashboard.rejectLog}
          />
        </>
      )}

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['all', 'pending', 'approved', 'rejected', 'draft'] as const).map(s => {
          const cfg = s === 'all' ? null : STATUS_CONFIG[s as WorklogStatus]
          const count = s === 'all' ? worklogs.length : counts[s as WorklogStatus]
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s as WorklogStatus | 'all')}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                statusFilter === s
                  ? cfg ? `text-white ${cfg.bg.replace('bg-', 'bg-')}` : 'bg-[var(--color-navy)] text-white'
                  : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)]'
              }`}
            >
              {cfg && <cfg.icon className="h-4 w-4" strokeWidth={1.9} />}
              {s === 'all' ? '전체' : cfg?.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${statusFilter === s ? 'bg-black/10' : 'bg-gray-100'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.9} />
          <input
            type="text"
            placeholder="현장명, 작성자 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <select
          value={siteFilter}
          onChange={e => setSiteFilter(e.target.value)}
          className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
        >
          <option value="all">전체 현장</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-4">반려 사유 입력</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요..."
              rows={4}
              className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                className="flex-1 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                disabled={!rejectReason.trim() || actionLoading === rejectingId}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {actionLoading === rejectingId ? '반려 중...' : '반려하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">해당 일지가 없습니다.</div>
        ) : (
          filtered.map(w => {
            const cfg = STATUS_CONFIG[w.status]
            const StatusIcon = cfg.icon
            return (
              <div key={w.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon className={`h-5 w-5 flex-shrink-0 ${cfg.color}`} strokeWidth={1.9} />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] mb-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" strokeWidth={1.9} />
                        {w.site_name || '미지정 현장'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" strokeWidth={1.9} />
                        {w.work_date}
                      </span>
                      <span>작성자: {w.user_name || w.user_id.slice(0, 8)}</span>
                    </div>
                    {(w.worker_count > 0 || w.total_man > 0) && (
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        작업자 {w.worker_count}명 · 총 {w.total_man}공수
                      </p>
                    )}
                    {w.status === 'rejected' && w.rejection_reason && (
                      <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        반려 사유: {w.rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {w.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(w.id)}
                        disabled={actionLoading === w.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" strokeWidth={1.9} />
                        승인
                      </button>
                      <button
                        onClick={() => { setRejectingId(w.id); setRejectReason(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition"
                      >
                        <XCircle className="h-4 w-4" strokeWidth={1.9} />
                        반려
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
