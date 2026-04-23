'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Send, Search, CheckCircle, Clock, AlertCircle, Users, Building2, ChevronDown } from 'lucide-react'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  href: string | null
  is_read: boolean
  created_at: string
  user_name?: string
  user_email?: string
  user_role?: string
}

interface Worker {
  id: string
  name: string
  email: string
  role: string
}

type NotificationRow = Omit<Notification, 'user_name' | 'user_email' | 'user_role'> & {
  worker?: { name?: string; email?: string; role?: string } | Array<{ name?: string; email?: string; role?: string }> | null
}

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  worklog_approved:   { bg: 'bg-green-50',  text: 'text-green-700', label: '일지 승인' },
  worklog_rejected:   { bg: 'bg-red-50',    text: 'text-red-700',   label: '일지 반려' },
  worklog_pending:    { bg: 'bg-yellow-50', text: 'text-yellow-700', label: '승인 대기' },
  material_low:       { bg: 'bg-orange-50',  text: 'text-orange-700', label: '재고 부족' },
  hq_request:         { bg: 'bg-blue-50',    text: 'text-blue-700',   label: '본사 요청' },
  announcement:       { bg: 'bg-purple-50',  text: 'text-purple-700', label: '안내' },
  system:            { bg: 'bg-gray-50',    text: 'text-gray-700',   label: '시스템' },
}

const BROADCAST_TYPE_OPTIONS = [
  { value: 'announcement', label: '전체 안내' },
  { value: 'system', label: '시스템 공지' },
  { value: 'worklog_pending', label: '일지 승인 요청' },
  { value: 'material_low', label: '재고 부족 안내' },
  { value: 'hq_request', label: '본사 요청' },
]

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<'list' | 'send'>('list')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showSendForm, setShowSendForm] = useState(false)
  const [sendTarget, setSendTarget] = useState<'all' | 'role' | 'site' | 'worker'>('all')
  const [sendRole, setSendRole] = useState<string>('worker')
  const [sendWorkerId, setSendWorkerId] = useState<string>('')
  const [sendTitle, setSendTitle] = useState('')
  const [sendBody, setSendBody] = useState('')
  const [sendType, setSendType] = useState('announcement')
  const [sendLoading, setSendLoading] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, { data: workersData }] = await Promise.all([
      supabase.from('notifications').select(`
        id, user_id, type, title, body, href, is_read, created_at,
        worker:workers(name, email, role)
      `).order('created_at', { ascending: false }).limit(200),
      supabase.from('workers').select('id, name, email, role').order('name'),
    ])

    if (!error && data) {
      const mappedNotifications: Notification[] = (data as NotificationRow[]).map(notification => {
        const worker = Array.isArray(notification.worker) ? notification.worker[0] : notification.worker

        return {
          id: notification.id,
          user_id: notification.user_id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          href: notification.href,
          is_read: notification.is_read,
          created_at: notification.created_at,
          user_name: worker?.name,
          user_email: worker?.email,
          user_role: worker?.role,
        }
      })

      setNotifications(mappedNotifications)
    }
    if (workersData) setWorkers(workersData)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }, [notifications, supabase])

  const handleSend = useCallback(async () => {
    if (!sendTitle.trim() || !sendBody.trim()) return
    setSendLoading(true)
    setSendResult(null)

    let targets: string[] = []
    if (sendTarget === 'all') {
      targets = workers.map(w => w.id)
    } else if (sendTarget === 'role') {
      targets = workers.filter(w => w.role === sendRole).map(w => w.id)
    } else if (sendTarget === 'worker') {
      targets = [sendWorkerId]
    }

    const inserts = targets.map(user_id => ({
      user_id,
      type: sendType,
      title: sendTitle.trim(),
      body: sendBody.trim(),
      href: null,
      is_read: false,
    }))

    const { error } = await supabase.from('notifications').insert(inserts)
    const successCount = error ? 0 : targets.length
    const failedCount = targets.length - successCount
    setSendResult({ success: successCount, failed: failedCount })
    setSendLoading(false)

    if (!error) {
      await fetchData()
      setSendTitle('')
      setSendBody('')
    }
  }, [sendTarget, sendRole, sendWorkerId, sendTitle, sendBody, sendType, workers, supabase, fetchData])

  const filtered = notifications.filter(n => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.user_name?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const typeOptions = Object.entries(TYPE_COLORS).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  }))

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('list')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === 'list'
              ? 'bg-[var(--color-navy)] text-white'
              : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)]'
          }`}
        >
          <Bell className="h-4 w-4" strokeWidth={1.9} />
          알림 목록
        </button>
        <button
          onClick={() => { setTab('send'); setSendResult(null); }}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === 'send'
              ? 'bg-[var(--color-navy)] text-white'
              : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)]'
          }`}
        >
          <Send className="h-4 w-4" strokeWidth={1.9} />
          알림 발송
        </button>
      </div>

      {tab === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.9} />
              <input
                type="text"
                placeholder="제목, 내용, 수신자 검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
            >
              <option value="all">전체 유형</option>
              {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {filtered.some(n => !n.is_read) && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition"
              >
                <CheckCircle className="h-4 w-4" strokeWidth={1.9} />
                전체 읽음 처리
              </button>
            )}
          </div>

          {/* List */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-12 text-[var(--color-text-secondary)]">로딩 중...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-[var(--color-text-secondary)]">알림이 없습니다.</div>
            ) : filtered.map(n => {
              const typeCfg = TYPE_COLORS[n.type] || TYPE_COLORS.system
              return (
                <div
                  key={n.id}
                  className={`bg-white rounded-xl shadow-sm p-4 flex items-start gap-4 ${!n.is_read ? 'border-l-4 border-[var(--color-accent)]' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${typeCfg.bg}`}>
                    <Bell className={`h-5 w-5 ${typeCfg.text}`} strokeWidth={1.9} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeCfg.bg} ${typeCfg.text}`}>
                        {typeCfg.label}
                      </span>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />}
                      <span className="text-xs text-[var(--color-text-tertiary)] ml-auto">
                        {new Date(n.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{n.title}</p>
                    {n.body && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">{n.body}</p>}
                    {n.user_name && (
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        수신: {n.user_name} ({n.user_email})
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'send' && (
        <div className="max-w-2xl">
          {/* Result */}
          {sendResult && (
            <div className={`mb-6 rounded-xl p-4 flex items-center gap-3 ${
              sendResult.failed === 0 ? 'bg-green-50' : 'bg-yellow-50'
            }`}>
              <CheckCircle className={`h-5 w-5 flex-shrink-0 ${sendResult.failed === 0 ? 'text-green-600' : 'text-yellow-600'}`} strokeWidth={1.9} />
              <div>
                <p className="text-sm font-medium">
                  {sendResult.failed === 0
                    ? `${sendResult.success}명에게 알림을 발송했습니다.`
                    : `${sendResult.success}명 성공, ${sendResult.failed}명 실패`}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-[var(--color-navy)] mb-6">알림 발송</h2>

            <div className="space-y-5">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-2">알림 유형</label>
                <select
                  value={sendType}
                  onChange={e => setSendType(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
                >
                  {BROADCAST_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Target */}
              <div>
                <label className="block text-sm font-medium mb-2">발송 대상</label>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {(['all', 'role', 'worker'] as const).map(t => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sendTarget"
                          value={t}
                          checked={sendTarget === t}
                          onChange={() => setSendTarget(t)}
                          className="accent-[var(--color-navy)]"
                        />
                        <span className="text-sm">
                          {t === 'all' ? '전체 사용자' : t === 'role' ? '역할별' : '개별 선택'}
                        </span>
                      </label>
                    ))}
                  </div>

                  {sendTarget === 'role' && (
                    <select
                      value={sendRole}
                      onChange={e => setSendRole(e.target.value)}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
                    >
                      <option value="worker">작업자</option>
                      <option value="partner">파트너</option>
                      <option value="site_manager">현장관리자</option>
                      <option value="admin">관리자</option>
                    </select>
                  )}

                  {sendTarget === 'worker' && (
                    <select
                      value={sendWorkerId}
                      onChange={e => setSendWorkerId(e.target.value)}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
                    >
                      <option value="">사용자 선택</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.email})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">제목 *</label>
                <input
                  value={sendTitle}
                  onChange={e => setSendTitle(e.target.value)}
                  placeholder="알림 제목을 입력하세요"
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium mb-2">내용 *</label>
                <textarea
                  value={sendBody}
                  onChange={e => setSendBody(e.target.value)}
                  placeholder="알림 내용을 입력하세요"
                  rows={4}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
              <button
                onClick={handleSend}
                disabled={sendLoading || !sendTitle.trim() || !sendBody.trim() || (sendTarget === 'worker' && !sendWorkerId)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-navy)] text-white rounded-lg font-medium hover:bg-[var(--color-navy-hover)] transition disabled:opacity-50"
              >
                <Send className="h-4 w-4" strokeWidth={1.9} />
                {sendLoading ? '발송 중...' : '알림 발송'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
