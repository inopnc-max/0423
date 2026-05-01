/**
 * Document audit - Audit log operations for document events.
 *
 * This module handles:
 * - Logging document views
 * - Logging document downloads
 * - Logging document shares
 * - Logging document lock/unlock
 * - Getting audit logs for a document
 *
 * All operations use authenticated Supabase client.
 */

import { createClient } from '@/lib/supabase/client'
import type {
  DocumentAuditLogRow,
  DocumentViewEventRow,
  LogDocumentViewParams,
} from './document-types'

/* ─── Log Document View ──────────────────────────────────── */

/**
 * Log a document view event.
 * Creates entries in both document_audit_logs and document_view_events tables.
 */
export async function logDocumentView(params: LogDocumentViewParams): Promise<void> {
  const supabase = createClient()

  await Promise.allSettled([
    supabase.from('document_audit_logs').insert({
      document_id: params.documentId,
      action: 'view',
      actor_id: params.userId,
    }),
    supabase.from('document_view_events').insert({
      document_id: params.documentId,
      user_id: params.userId,
    }),
  ])
}

/* ─── Log Document Download ───────────────────────────────── */

/**
 * Log a document download event.
 */
export async function logDocumentDownload(
  documentId: string,
  userId: string
): Promise<void> {
  const supabase = createClient()

  try {
    const { error } = await supabase.from('document_audit_logs').insert({
      document_id: documentId,
      action: 'download',
      actor_id: userId,
    })
    if (error) {
      console.warn('[documentAudit] failed to log download:', error)
    }
  } catch (err) {
    console.warn('[documentAudit] failed to log download:', err)
  }
}

/* ─── Log Document Share ─────────────────────────────────── */

/**
 * Log a document share event.
 */
export async function logDocumentShare(
  documentId: string,
  actorId: string,
  targetType?: string,
  targetId?: string
): Promise<void> {
  const supabase = createClient()

  try {
    const { error } = await supabase.from('document_audit_logs').insert({
      document_id: documentId,
      action: 'share',
      actor_id: actorId,
      after_data: targetType || targetId
        ? { target_type: targetType ?? null, target_id: targetId ?? null }
        : null,
    })
    if (error) {
      console.warn('[documentAudit] failed to log share:', error)
    }
  } catch (err) {
    console.warn('[documentAudit] failed to log share:', err)
  }
}

/* ─── Log Document Lock ─────────────────────────────────── */

/**
 * Log a document lock event.
 */
export async function logDocumentLock(
  documentId: string,
  actorId: string,
  reason?: string
): Promise<void> {
  const supabase = createClient()

  try {
    const { error } = await supabase.from('document_audit_logs').insert({
      document_id: documentId,
      action: 'lock',
      actor_id: actorId,
      reason: reason ?? null,
    })
    if (error) {
      console.warn('[documentAudit] failed to log lock:', error)
    }
  } catch (err) {
    console.warn('[documentAudit] failed to log lock:', err)
  }
}

/* ─── Log Document Unlock ─────────────────────────────────── */

/**
 * Log a document unlock event.
 */
export async function logDocumentUnlock(
  documentId: string,
  actorId: string,
  reason?: string
): Promise<void> {
  const supabase = createClient()

  try {
    const { error } = await supabase.from('document_audit_logs').insert({
      document_id: documentId,
      action: 'unlock',
      actor_id: actorId,
      reason: reason ?? null,
    })
    if (error) {
      console.warn('[documentAudit] failed to log unlock:', error)
    }
  } catch (err) {
    console.warn('[documentAudit] failed to log unlock:', err)
  }
}

/* ─── Get Audit Logs for Document ─────────────────────────── */

/**
 * Get audit logs for a document, ordered by created_at descending.
 */
export async function getDocumentAuditLogs(documentId: string): Promise<DocumentAuditLogRow[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('document_audit_logs')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return []
  return (data ?? []) as DocumentAuditLogRow[]
}

/* ─── Get Recent View Events ──────────────────────────────── */

/**
 * Get recent view events for a document.
 */
export async function getRecentViewEvents(
  documentId: string,
  limit = 10
): Promise<DocumentViewEventRow[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('document_view_events')
    .select('*')
    .eq('document_id', documentId)
    .order('viewed_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as DocumentViewEventRow[]
}
