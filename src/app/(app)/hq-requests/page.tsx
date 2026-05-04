'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, MessageCircle, Send, CheckCircle, XCircle, RefreshCw, FileText } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { isAdmin, isSiteManager } from '@/lib/roles'
import { usePreview } from '@/components/preview'
import type { SiteSummary } from '@/contexts/selected-site-context'
import { SiteCombobox } from '@/components/site/SiteCombobox'

interface SubmittedRequest {
  id: string
  siteName: string
  category: string
  title: string
  message: string
  composedMessage: string
  createdAt: string
}

interface HQRequest {
  id: string
  user_id: string
  site_id: string | null
  category: string
  message: string | null
  source: string
  status: string
  created_at: string
  handled_at: string | null
  handled_by: string | null
  siteName?: string | null
}

type FilterStatus = 'all' | 'open' | 'handled' | 'rejected'

const CATEGORIES = ['일정', '자재', '문서', '인원', '안전', '기타'] as const

const RAW_KAKAO_CHANNEL_ID = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID?.trim() ?? ''
const HAS_KAKAO_CHANNEL_ID = RAW_KAKAO_CHANNEL_ID.length > 0

const KAKAO_CHANNEL_PUBLIC_ID = HAS_KAKAO_CHANNEL_ID
  ? RAW_KAKAO_CHANNEL_ID.startsWith('_') ? RAW_KAKAO_CHANNEL_ID : `_${RAW_KAKAO_CHANNEL_ID}`
  : ''

const KAKAO_CHAT_URL =
  process.env.NEXT_PUBLIC_KAKAO_CHANNEL_CHAT_URL ||
  (HAS_KAKAO_CHANNEL_ID ? `https://pf.kakao.com/${KAKAO_CHANNEL_PUBLIC_ID}/chat` : '')

const KAKAO_APP_SCHEME =
  HAS_KAKAO_CHANNEL_ID
    ? `kakaoplus://plusfriend/home?publicId=${KAKAO_CHANNEL_PUBLIC_ID}`
    : ''

function buildKakaoMessage(req: SubmittedRequest): string {
  return `[본사요청]
요청ID: ${req.id}
현장: ${req.siteName || '미선택'}
분류: ${req.category}
제목: ${req.title}
내용:
${req.message}

접수시간: ${new Date(req.createdAt).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusLabel(status: string): { label: string; className: string } {
  switch (status) {
    case 'open':
      return { label: '접수', className: 'bg-yellow-100 text-yellow-700' }
    case 'handled':
      return { label: '처리완료', className: 'bg-green-100 text-green-700' }
    case 'rejected':
      return { label: '반려', className: 'bg-red-100 text-red-700' }
    default:
      return { label: status, className: 'bg-gray-100 text-gray-600' }
  }
}

export default function HQRequestsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const { openPreview } = usePreview()

  const isAdminUser = user ? isAdmin(user.role) : false
  const isSiteManagerUser = user ? isSiteManager(user.role) : false
  const isManagerUser = isAdminUser || isSiteManagerUser

  const [sites, setSites] = useState<SiteSummary[]>([])
  const [siteId, setSiteId] = useState<string | null>(null)
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('일정')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequest | null>(null)
  const [copying, setCopying] = useState(false)
  const [openingKakao, setOpeningKakao] = useState(false)

  // My requests state (all users)
  const [requests, setRequests] = useState<HQRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)

  // Admin list state (manager only)
  const [adminRequests, setAdminRequests] = useState<HQRequest[]>([])
  const [adminFilter, setAdminFilter] = useState<FilterStatus>('open')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminProcessingId, setAdminProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    async function fetchSites() {
      try {
        const { data } = await supabase.from('sites').select('id, name, company, affiliation, status, address').order('name')
        if (data) setSites(data)
      } catch (error) {
        console.error('Failed to load sites for HQ request:', error)
      }
    }

    void fetchSites()
  }, [supabase, user])

  // Fetch all requests (for preview)
  const fetchMyRequests = useCallback(async () => {
    if (!user) return

    setLoadingRequests(true)
    try {
      const { data, error } = await supabase
        .from('hq_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const siteMap = new Map(sites.map(s => [s.id, s.name]))
      const requestsWithSiteName: HQRequest[] = (data || []).map(req => ({
        ...req,
        siteName: req.site_id ? siteMap.get(req.site_id) || null : null,
      }))

      setRequests(requestsWithSiteName)
    } catch (error) {
      console.error('Failed to load my requests:', error)
    } finally {
      setLoadingRequests(false)
    }
  }, [supabase, user, sites])

  // Admin: fetch all requests
  const fetchAdminRequests = useCallback(async () => {
    if (!user) return

    setAdminLoading(true)
    try {
      const { data, error } = await supabase
        .from('hq_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      const siteMap = new Map(sites.map(s => [s.id, s.name]))
      const requestsWithSiteName: HQRequest[] = (data || []).map(req => ({
        ...req,
        siteName: req.site_id ? siteMap.get(req.site_id) || null : null,
      }))

      setAdminRequests(requestsWithSiteName)
    } catch (error) {
      console.error('Failed to load admin requests:', error)
    } finally {
      setAdminLoading(false)
    }
  }, [supabase, user, sites])

  // Fetch my requests when sites loaded
  useEffect(() => {
    if (user && sites.length > 0) {
      void fetchMyRequests()
    }
  }, [user, sites, fetchMyRequests])

  // Fetch admin requests for managers
  useEffect(() => {
    if (isManagerUser) {
      void fetchAdminRequests()
    }
  }, [isManagerUser, fetchAdminRequests])

  const filteredAdminRequests = adminRequests.filter(req => {
    if (adminFilter === 'all') return true
    return req.status === adminFilter
  })

  const handleAdminAction = async (requestId: string, action: 'handled' | 'rejected') => {
    if (!user) return

    setAdminProcessingId(requestId)
    const handledAt = new Date().toISOString()
    try {
      const { error } = await supabase
        .from('hq_requests')
        .update({
          status: action,
          handled_at: handledAt,
          handled_by: user.userId,
        })
        .eq('id', requestId)

      if (error) throw error

      setAdminRequests(prev =>
        prev.map(req =>
          req.id === requestId
            ? { ...req, status: action, handled_at: handledAt, handled_by: user.userId }
            : req
        )
      )

      setFeedback({
        type: 'success',
        text: action === 'handled' ? '처리가 완료되었습니다.' : '반려 처리되었습니다.',
      })
    } catch (error: any) {
      console.error('Failed to update request:', error)
      setFeedback({
        type: 'error',
        text: error?.message || '처리 중 오류가 발생했습니다.',
      })
    } finally {
      setAdminProcessingId(null)
    }
  }

  const handleCopyRequest = useCallback(async () => {
    if (!submittedRequest) return
    setCopying(true)
    try {
      const text = buildKakaoMessage(submittedRequest)
      await navigator.clipboard.writeText(text)
      setFeedback({ type: 'success', text: '요청 내용을 클립보드에 복사했습니다.' })
    } catch {
      setFeedback({ type: 'error', text: '클립보드 복사에 실패했습니다.' })
    } finally {
      setCopying(false)
    }
  }, [submittedRequest])

  const handleOpenKakaoChannel = useCallback(async () => {
    if (!submittedRequest) return
    setOpeningKakao(true)
    try {
      const text = buildKakaoMessage(submittedRequest)
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // Clipboard copy fails even if channel opens
      }

      const isMobile = /Mobi|Android/i.test(navigator.userAgent)

      if (isMobile) {
        const timer = setTimeout(() => {
          if (!document.hidden) {
            window.location.href = KAKAO_CHAT_URL
          }
        }, 1500)

        const visibilityHandler = () => {
          clearTimeout(timer)
          document.removeEventListener('visibilitychange', visibilityHandler)
        }
        document.addEventListener('visibilitychange', visibilityHandler)

        window.location.href = KAKAO_APP_SCHEME
      } else {
        window.open(KAKAO_CHAT_URL, '_blank')
      }

      setFeedback({
        type: 'success',
        text: '카카오채널이 열렸습니다. 복사된 내용을 붙여넣어 전송해 주세요.',
      })
    } catch {
      setFeedback({ type: 'error', text: '카카오채널을 열 수 없습니다.' })
    } finally {
      setOpeningKakao(false)
    }
  }, [submittedRequest])

  const handlePreviewRequest = useCallback(
    (request: HQRequest) => {
      const statusInfo = getStatusLabel(request.status)
      const siteDisplay = request.siteName || '현장 미선택'

      openPreview({
        title: `본사요청 · ${request.category}`,
        subtitle: `${siteDisplay} · ${statusInfo.label} · ${formatDate(request.created_at)}`,
        contentType: 'report',
        dockMode: 'readonly',
        showBack: false,
        onClose: () => {},
        children: (
          <div className="p-4 space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">분류</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-navy)] text-white">
                  {request.category}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">현장</span>
                <span className="text-sm text-[var(--color-text)]">{siteDisplay}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">상태</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">접수일시</span>
                <span className="text-sm text-[var(--color-text)]">
                  {formatDate(request.created_at)}
                </span>
              </div>
              {request.handled_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">처리일시</span>
                  <span className="text-sm text-[var(--color-text)]">
                    {formatDate(request.handled_at)}
                  </span>
                </div>
              )}
            </div>
            {request.message && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">요청 내용</span>
                <div className="rounded-xl bg-white border border-[var(--color-border)] p-4">
                  <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
                    {request.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        ),
      })
    },
    [openPreview]
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    if (!title.trim() || !message.trim()) {
      setFeedback({ type: 'error', text: '요청 제목과 내용을 모두 입력해 주세요.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)
    setSubmittedRequest(null)

    try {
      const composedMessage = `[${title.trim()}] ${message.trim()}`
      const siteName = sites.find(s => s.id === siteId)?.name || ''

      const { error } = await supabase
        .from('hq_requests')
        .insert({
          user_id: user.userId,
          site_id: siteId,
          category,
          message: composedMessage,
          source: 'app',
        })

      if (error) throw error

      const newRequest: HQRequest = {
        id: `local-${Date.now()}`,
        user_id: user.userId,
        site_id: siteId || null,
        category,
        message: composedMessage,
        source: 'app',
        status: 'open',
        created_at: new Date().toISOString(),
        handled_at: null,
        handled_by: null,
        siteName: siteName || null,
      }

      setRequests(prev => [newRequest, ...prev])

      setSubmittedRequest({
        id: `local-${Date.now()}`,
        siteName,
        category,
        title: title.trim(),
        message: message.trim(),
        composedMessage,
        createdAt: new Date().toISOString(),
      })

      setTitle('')
      setMessage('')
      setSiteId(null)
      setCategory('일정')
      setFeedback({
        type: 'success',
        text: '본사요청을 접수했습니다. 필요 시 카카오채널로 같은 내용을 전달할 수 있습니다.',
      })

      // Refresh admin list if manager
      if (isManagerUser) {
        void fetchAdminRequests()
      }
    } catch (error: any) {
      console.error('Failed to create HQ request:', error)
      setFeedback({
        type: 'error',
        text: error?.message || '본사요청 저장 중 오류가 발생했습니다.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-navy)]">본사요청</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          본사에 요청한 내역과 답변을 확인합니다.
        </p>
      </div>

      {/* Admin: Request Management List */}
      {isManagerUser && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-navy)]">본사요청 처리 목록</h2>
            <button
              type="button"
              onClick={() => void fetchAdminRequests()}
              disabled={adminLoading}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-[#394679] bg-[#eef1f8] hover:bg-[#e6ebf6] border border-[#d4ddef] transition active:scale-[0.98] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${adminLoading ? 'animate-spin' : ''}`} strokeWidth={1.9} />
              <span>새로고침</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'open', 'handled', 'rejected'] as FilterStatus[]).map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setAdminFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition ${
                  adminFilter === status
                    ? 'bg-[var(--color-navy)] text-white'
                    : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? '전체' : status === 'open' ? '접수' : status === 'handled' ? '처리완료' : '반려'}
                {status !== 'all' && (
                  <span className="ml-1">
                    ({adminRequests.filter(r => r.status === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Request List */}
          {adminLoading ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-[var(--color-text-secondary)] shadow-sm">
              불러오는 중...
            </div>
          ) : filteredAdminRequests.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-[var(--color-text-secondary)] shadow-sm">
              처리할 요청이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAdminRequests.map(request => {
                const statusInfo = getStatusLabel(request.status)
                return (
                  <div
                    key={request.id}
                    className="rounded-2xl bg-white p-4 shadow-sm transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[#3b4b7c]">
                        <FileText className="h-4 w-4" strokeWidth={1.9} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-navy)] text-white">
                            {request.category}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-[var(--color-text)] truncate">
                          {request.message || '내용 없음'}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                          {request.siteName && (
                            <span className="truncate">{request.siteName}</span>
                          )}
                          <span>{formatDate(request.created_at)}</span>
                          {request.handled_at && (
                            <span className="text-green-600">
                              처리: {formatDate(request.handled_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - only for open status */}
                    {request.status === 'open' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleAdminAction(request.id, 'handled')}
                          disabled={adminProcessingId === request.id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-green-50 px-3 py-2 text-sm font-medium text-green-700 border border-green-200 transition hover:bg-green-100 disabled:opacity-60"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>처리완료</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleAdminAction(request.id, 'rejected')}
                          disabled={adminProcessingId === request.id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-red-50 px-3 py-2 text-sm font-medium text-red-700 border border-red-200 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>반려</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Request Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">현장</span>
            <SiteCombobox
              sites={sites}
              selectedId={siteId}
              onSelect={id => setSiteId(id)}
              placeholder="현장 선택"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">요청 분류</span>
            <select
              value={category}
              onChange={event => setCategory(event.target.value as (typeof CATEGORIES)[number])}
              className="w-full rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
            >
              {CATEGORIES.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">요청 제목</span>
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="예: 안전서류 승인 요청"
            className="w-full rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">요청 내용</span>
          <textarea
            value={message}
            onChange={event => setMessage(event.target.value)}
            placeholder="상세 요청 내용을 입력하세요"
            rows={6}
            className="w-full rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        {feedback && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {submittedRequest && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              카카오채널로도 전달하시겠습니까?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyRequest}
                disabled={copying}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-gray-50 disabled:opacity-60"
              >
                <Copy className="h-4 w-4" />
                <span>{copying ? '복사 중...' : '요청 내용 복사'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenKakaoChannel}
                disabled={openingKakao}
                data-kakao-chat-url={KAKAO_CHAT_URL}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FEE500] px-4 py-2.5 text-sm font-medium text-[#3C1E1E] transition hover:opacity-90 disabled:opacity-60"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{openingKakao ? '열기 중...' : '카카오채널 열기'}</span>
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              카카오채널이 열리면 복사된 내용을 붙여넣어 전송해 주세요.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)] disabled:opacity-60"
        >
          <Send className="h-4 w-4" strokeWidth={1.9} />
          <span>{submitting ? '전송 중...' : '본사요청 보내기'}</span>
        </button>
      </form>

      {/* My Requests List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">내 요청 목록</h2>
          <button
            type="button"
            onClick={() => void fetchMyRequests()}
            disabled={loadingRequests}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-[#394679] bg-[#eef1f8] hover:bg-[#e6ebf6] border border-[#d4ddef] transition active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loadingRequests ? 'animate-spin' : ''}`} strokeWidth={1.9} />
            <span>새로고침</span>
          </button>
        </div>

        {loadingRequests && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-[var(--color-text-secondary)]">불러오는 중...</div>
          </div>
        )}

        {!loadingRequests && requests.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <FileText className="mx-auto h-10 w-10 text-[var(--color-text-tertiary)]" />
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              등록된 요청이 없습니다.
            </p>
          </div>
        )}

        {!loadingRequests && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map(request => {
              const statusInfo = getStatusLabel(request.status)
              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => handlePreviewRequest(request)}
                  className="w-full rounded-2xl bg-white p-4 text-left shadow-sm transition hover:bg-slate-50 hover:shadow-md active:bg-slate-50 active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[#3b4b7c]">
                      <FileText className="h-4 w-4" strokeWidth={1.9} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-navy)] text-white">
                          {request.category}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-[var(--color-text)] truncate">
                        {request.message || '내용 없음'}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                        {request.siteName && (
                          <span className="truncate">{request.siteName}</span>
                        )}
                        <span>{formatDate(request.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
