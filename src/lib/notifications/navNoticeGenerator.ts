/**
 * navNoticeGenerator - Create nav_update_events for BottomNav notifications.
 *
 * This module handles creating notice events when:
 * - daily_logs status changes
 * - confirmation_forms status changes
 * - photo_sheet status changes
 * - documents are shared
 * - salary_statements status changes
 * - sync_queue fails
 */

import { createClient } from '@/lib/supabase/client'
import type { CreateNoticeParams, BottomNavNoticeType } from '@/lib/types/nav-update'

/* ─── Create Notice ─────────────────────────────────────── */

/**
 * Create a single nav_update_event.
 * Returns the notice ID.
 */
export async function createNotice(params: CreateNoticeParams): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('nav_update_events')
    .insert({
      user_id: params.userId,
      notice_type: params.noticeType,
      title: params.title,
      body: params.body ?? null,
      route: params.route ?? null,
      route_params: params.routeParams ?? null,
      target_id: params.targetId ?? null,
      target_type: params.targetType ?? null,
      is_read: false,
    })
    .select('id')
    .single()

  if (error) {
    console.warn('[navNoticeGenerator] createNotice failed:', error)
    return null
  }

  return data.id
}

/* ─── Notice Creators ──────────────────────────────────── */

/**
 * Notify worker when their daily log status changes.
 */
export async function notifyDailyLogStatusChange(params: {
  userId: string
  siteId: string
  workDate: string
  status: 'approved' | 'rejected' | 'pending'
  rejectedReason?: string
}): Promise<string | null> {
  const titles: Record<string, string> = {
    approved: '일지 승인이 완료되었습니다.',
    rejected: '일지가 반려되었습니다.',
    pending: '일지 승인이 요청되었습니다.',
  }

  return createNotice({
    userId: params.userId,
    noticeType: 'daily_log_status',
    title: titles[params.status] ?? `일지 상태가 변경되었습니다: ${params.status}`,
    body: params.rejectedReason ?? undefined,
    route: '/worklog',
    routeParams: { site: params.siteId, date: params.workDate },
    targetId: `${params.siteId}:${params.workDate}`,
    targetType: 'daily_log',
  })
}

/**
 * Notify when confirmation form status changes.
 */
export async function notifyConfirmationFormStatus(params: {
  userId: string
  documentId: string
  title: string
  status: 'draft' | 'saved' | 'shared' | 'locked' | 'archived'
}): Promise<string | null> {
  const titles: Record<string, string> = {
    saved: '확인서가 저장되었습니다.',
    shared: '확인서가 공유되었습니다.',
    locked: '확인서가 잠겼습니다.',
    archived: '확인서가 보관되었습니다.',
    draft: '확인서 임시저장됨.',
  }

  return createNotice({
    userId: params.userId,
    noticeType: 'confirmation_form',
    title: titles[params.status] ?? `확인서: ${params.status}`,
    body: params.title,
    route: '/confirm-sheet',
    routeParams: { id: params.documentId },
    targetId: params.documentId,
    targetType: 'confirmation_form',
  })
}

/**
 * Notify when photo sheet final is saved or status changes.
 */
export async function notifyPhotoSheetStatus(params: {
  userId: string
  siteId: string
  workDate: string
  documentId: string
  action: 'saved' | 'approved' | 'rejected'
}): Promise<string | null> {
  const titles: Record<string, string> = {
    saved: '사진대지 최종본이 저장되었습니다.',
    approved: '사진대지가 승인되었습니다.',
    rejected: '사진대지가 반려되었습니다.',
  }

  return createNotice({
    userId: params.userId,
    noticeType: 'photo_sheet',
    title: titles[params.action] ?? `사진대지: ${params.action}`,
    route: '/documents',
    routeParams: { site: params.siteId },
    targetId: params.documentId,
    targetType: 'document',
  })
}

/**
 * Notify when a document is shared with a user.
 */
export async function notifyDocumentShared(params: {
  userId: string
  documentId: string
  title: string
  sharedByName?: string
  scope: 'site' | 'company' | 'public'
}): Promise<string | null> {
  return createNotice({
    userId: params.userId,
    noticeType: 'document_shared',
    title: '새 문서가 공유되었습니다.',
    body: params.title + (params.sharedByName ? ` (${params.sharedByName})` : ''),
    route: '/documents',
    routeParams: { id: params.documentId },
    targetId: params.documentId,
    targetType: 'document',
  })
}

/**
 * Notify when salary statement status changes.
 */
export async function notifySalaryStatementStatus(params: {
  userId: string
  statementId: string
  workMonth: string
  status: string
}): Promise<string | null> {
  return createNotice({
    userId: params.userId,
    noticeType: 'salary_statement',
    title: `급여명세서 (${params.workMonth}) 상태 변경: ${params.status}`,
    route: '/notifications',
    targetId: params.statementId,
    targetType: 'salary_statement',
  })
}

/**
 * Notify when sync queue has failures.
 */
export async function notifySyncFailed(params: {
  userId: string
  failedCount: number
  entityType?: string
}): Promise<string | null> {
  return createNotice({
    userId: params.userId,
    noticeType: 'sync_failed',
    title: '동기화 실패',
    body: params.failedCount > 1
      ? `${params.failedCount}건의 항목 동기화에 실패했습니다.`
      : '동기화에 실패한 항목이 있습니다.',
    route: '/settings',
    routeParams: undefined,
    targetId: null,
    targetType: 'sync_queue',
  })
}

/* ─── Delete Expired Notices ─────────────────────────────── */

/**
 * Delete notices older than 30 days.
 * Should be called periodically (e.g., on app load).
 */
export async function deleteExpiredNotices(): Promise<void> {
  const supabase = createClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  await supabase
    .from('nav_update_events')
    .delete()
    .eq('is_read', true)
    .lt('created_at', cutoff.toISOString())
}

/* ─── Aggregate Notices ─────────────────────────────────── */

/**
 * Aggregate notices of the same type into a single notice with a count.
 */
export function aggregateNotices<T extends { noticeType: string; count?: number }>(
  notices: T[]
): T[] {
  const map = new Map<string, T & { count: number }>()

  for (const notice of notices) {
    const key = notice.noticeType
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
    } else {
      map.set(key, { ...notice, count: 1 })
    }
  }

  return Array.from(map.values())
}
