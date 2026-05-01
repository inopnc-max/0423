/**
 * Document share - Share link creation and management.
 *
 * This module handles:
 * - Creating share links (document_shares table)
 * - Getting share links by token
 * - Revoking share links
 * - Updating share settings
 *
 * All operations use authenticated Supabase client.
 */

import { createClient } from '@/lib/supabase/client'
import type {
  DocumentShareRow,
  CreateShareLinkParams,
  UpdateShareSettingsParams,
} from './document-types'

/**
 * Generate a random share token (32 hex chars).
 */
function generateShareToken(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

/* ─── Create Share Link ─────────────────────────────────────── */

/**
 * Create a share link for a document.
 * Returns the share token.
 */
export async function createShareLink(params: CreateShareLinkParams): Promise<string> {
  const supabase = createClient()
  const token = generateShareToken()

  const { data, error } = await supabase
    .from('document_shares')
    .insert({
      document_id: params.documentId,
      share_token: token,
      shared_by: params.sharedBy,
      share_scope: params.shareScope ?? 'site',
      share_with_role: params.shareWithRole ?? null,
      share_with_user_id: params.shareWithUserId ?? null,
      allow_download: params.allowDownload ?? false,
      expires_at: params.expiresAt ?? null,
    })
    .select('share_token')
    .single()

  if (error) throw error
  return data.share_token as string
}

/* ─── Get Share Link by Token ──────────────────────────────── */

/**
 * Get share information by token.
 * Returns null if token doesn't exist or is expired.
 */
export async function getShareLink(shareToken: string): Promise<DocumentShareRow | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('document_shares')
    .select('*')
    .eq('share_token', shareToken)
    .single()

  if (error || !data) return null

  const share = data as DocumentShareRow

  if (share.revoked_at) return null

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return null
  }

  return share
}

/* ─── Get Shares by Document ──────────────────────────────── */

/**
 * Get all active (non-revoked, non-expired) shares for a document.
 */
export async function getSharesByDocument(documentId: string): Promise<DocumentShareRow[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('document_shares')
    .select('*')
    .eq('document_id', documentId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) return []

  const rows = data as DocumentShareRow[]
  return rows.filter(share => {
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return false
    }
    return true
  })
}

/* ─── Revoke Share Link ──────────────────────────────────── */

/**
 * Revoke a share link by marking it as revoked.
 */
export async function revokeShareLink(shareId: string, revokedBy: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('document_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId)
    .eq('shared_by', revokedBy)

  if (error) throw error
}

/* ─── Revoke All Shares for Document ──────────────────────── */

/**
 * Revoke all share links for a document.
 */
export async function revokeAllShares(documentId: string, revokedBy: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('document_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('document_id', documentId)
    .eq('shared_by', revokedBy)
    .is('revoked_at', null)

  if (error) throw error
}

/* ─── Update Share Settings ────────────────────────────────── */

/**
 * Update share settings (allow_download, expires_at).
 */
export async function updateShareSettings(
  shareId: string,
  params: UpdateShareSettingsParams
): Promise<void> {
  const supabase = createClient()

  const updates: Partial<DocumentShareRow> = {}

  if (params.allowDownload !== undefined) {
    updates.allow_download = params.allowDownload
  }

  if (params.expiresAt !== undefined) {
    updates.expires_at = params.expiresAt
  }

  if (params.revokedAt !== undefined) {
    updates.revoked_at = params.revokedAt
  }

  const { error } = await supabase
    .from('document_shares')
    .update(updates)
    .eq('id', shareId)

  if (error) throw error
}

/* ─── Build Share URL ──────────────────────────────────────── */

/**
 * Build a share URL from a share token.
 */
export function buildShareUrl(token: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/share/${token}`
}
