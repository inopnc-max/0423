'use client'

import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'

interface SiteOption {
  id: string
  name: string
}

const CATEGORIES = ['일정', '자재', '문서', '인원', '안전', '기타'] as const

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    if (!title.trim() || !message.trim()) {
      setFeedback({ type: 'error', text: '요청 제목과 내용을 모두 입력해 주세요.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const composedMessage = `[${title.trim()}] ${message.trim()}`

      const { error } = await supabase.from('hq_requests').insert({
        user_id: user.userId,
        site_id: siteId || null,
        category,
        message: composedMessage,
        source: 'app',
      })

      if (error) throw error

      setTitle('')
      setMessage('')
      setSiteId('')
      setCategory('일정')
      setFeedback({ type: 'success', text: '본사요청이 등록되었습니다.' })
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
          현장 이슈나 문서 요청을 본사에 바로 전달할 수 있습니다.
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
            placeholder="상세 요청 내용을 입력하세요."
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
