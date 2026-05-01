/**
 * useBottomNavNotices - Hook for fetching and managing BottomNav notice data.
 *
 * This hook provides:
 * - Unread notice count per role
 * - Aggregated notice list
 * - Mark as read functionality
 * - Route calculation for notice navigation
 */

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type { BottomNavNotice, BottomNavNoticeCount } from '@/lib/types/nav-update'
import type { Role } from '@/lib/roles'

/* ─── Helper: role-based notice type visibility ─────────────── */

const NOTICE_TYPE_PRIORITY: Record<string, number> = {
  approval_required: 10,
  daily_log_status: 8,
  worklog_reminder: 7,
  document_shared: 6,
  photo_sheet: 5,
  confirmation_form: 4,
  salary_statement: 3,
  sync_failed: 2,
}

const ROLE_NOTICE_VISIBILITY: Record<string, string[]> = {
  worker: ['daily_log_status', 'confirmation_form', 'document_shared', 'salary_statement', 'sync_failed', 'worklog_reminder'],
  site_manager: ['daily_log_status', 'approval_required', 'confirmation_form', 'photo_sheet', 'document_shared', 'sync_failed'],
  partner: ['document_shared', 'daily_log_status'],
  admin: ['daily_log_status', 'approval_required', 'confirmation_form', 'photo_sheet', 'document_shared', 'salary_statement', 'sync_failed'],
  production_manager: ['sync_failed', 'worklog_reminder'],
}

/* ─── useBottomNavNotices ────────────────────────────────── */

export interface UseBottomNavNoticesResult {
  /** Unread notices for current user */
  notices: BottomNavNotice[]
  /** Unread count grouped by type */
  noticeCounts: BottomNavNoticeCount[]
  /** Total unread count */
  totalUnread: number
  loading: boolean
  error: string | null
  markAsRead: (noticeId: string) => Promise<void>
  refresh: () => void
}

export function useBottomNavNotices(): UseBottomNavNoticesResult {
  const { user } = useAuth()
  const [notices, setNotices] = useState<BottomNavNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotices = useCallback(async () => {
    if (!user?.userId) {
      setNotices([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const visibleTypes = ROLE_NOTICE_VISIBILITY[user.role] ?? []

      if (visibleTypes.length === 0) {
        setNotices([])
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('nav_update_events')
        .select('*')
        .eq('user_id', user.userId)
        .in('notice_type', visibleTypes)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      const rows = (data ?? []) as Record<string, unknown>[]
      const mapped: BottomNavNotice[] = rows.map(row => ({
        id: String(row.id),
        userId: String(row.user_id),
        noticeType: String(row.notice_type) as BottomNavNotice['noticeType'],
        title: String(row.title),
        body: row.body as string | null,
        route: row.route as string | null,
        routeParams: row.route_params as Record<string, string> | null,
        targetId: row.target_id as string | null,
        targetType: row.target_type as string | null,
        isRead: Boolean(row.is_read),
        createdAt: String(row.created_at),
      }))

      setNotices(mapped)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알림을 불러오지 못했습니다.'
      setError(msg)
      setNotices([])
    } finally {
      setLoading(false)
    }
  }, [user?.userId, user?.role])

  useEffect(() => {
    void fetchNotices()
  }, [fetchNotices])

  /* ─── Aggregate by type ─────────────────────────────────── */

  const noticeCounts: BottomNavNoticeCount[] = (() => {
    const unread = notices.filter(n => !n.isRead)
    const byType = new Map<string, BottomNavNotice[]>()

    for (const n of unread) {
      const existing = byType.get(n.noticeType) ?? []
      byType.set(n.noticeType, [...existing, n])
    }

    return Array.from(byType.entries())
      .map(([noticeType, items]) => ({
        noticeType: noticeType as BottomNavNotice['noticeType'],
        count: items.length,
        latestTitle: items[0]?.title ?? '',
        latestCreatedAt: items[0]?.createdAt ?? '',
      }))
      .sort((a, b) => {
        const pa = NOTICE_TYPE_PRIORITY[a.noticeType] ?? 0
        const pb = NOTICE_TYPE_PRIORITY[b.noticeType] ?? 0
        return pb - pa
      })
  })()

  const totalUnread = notices.filter(n => !n.isRead).length

  /* ─── Mark as read ──────────────────────────────────────── */

  const markAsRead = useCallback(async (noticeId: string) => {
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('nav_update_events')
        .update({ is_read: true })
        .eq('id', noticeId)

      if (updateError) {
        console.warn('[useBottomNavNotices] markAsRead failed:', updateError)
        return
      }

      setNotices(prev =>
        prev.map(n => n.id === noticeId ? { ...n, isRead: true } : n)
      )
    } catch {
      // Silent fail
    }
  }, [])

  return {
    notices,
    noticeCounts,
    totalUnread,
    loading,
    error,
    markAsRead,
    refresh: () => { void fetchNotices() },
  }
}

/* ─── getNoticeRoute ──────────────────────────────────────── */

/**
 * Calculate the navigation route for a notice.
 */
export function getNoticeRoute(notice: BottomNavNotice): string {
  if (!notice.route) return '/notifications'

  let route = notice.route

  if (notice.routeParams) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(notice.routeParams)) {
      params.set(key, value)
    }
    const query = params.toString()
    if (query) {
      route = `${route}?${query}`
    }
  }

  return route
}
