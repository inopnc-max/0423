'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, MessageCircle, Send } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'

interface SiteOption {
  id: string
  name: string
}

interface SubmittedRequest {
  id: string
  siteName: string
  category: string
  title: string
  message: string
  composedMessage: string
  createdAt: string
}

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

export default function HQRequestsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [sites, setSites] = useState<SiteOption[]>([])
  const [siteId, setSiteId] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('일정')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequest | null>(null)
  const [copying, setCopying] = useState(false)
  const [openingKakao, setOpeningKakao] = useState(false)

  useEffect(() => {
    if (!user) return

    async function fetchSites() {
      try {
        const { data } = await supabase.from('sites').select('id, name').order('name')
        if (data) setSites(data)
      } catch (error) {
        console.error('Failed to load sites for HQ request:', error)
      }
    }

    void fetchSites()
  }, [supabase, user])

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
          site_id: siteId || null,
          category,
          message: composedMessage,
          source: 'app',
        })

      if (error) throw error

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
      setSiteId('')
      setCategory('일정')
      setFeedback({
        type: 'success',
        text: '본사요청을 접수했습니다. 필요 시 카카오채널로 같은 내용을 전달할 수 있습니다.',
      })
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
      <div>
        <h1 className="text-xl font-bold text-[var(--color-navy)]">본사요청</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          현장 이슈와 문서 요청을 본사에 바로 전달할 수 있습니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">현장</span>
            <select
              value={siteId}
              onChange={event => setSiteId(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">현장 선택</option>
              {sites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
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
    </div>
  )
}
