/**
 * useDocumentActions - React hooks for document save/share/version operations.
 *
 * This hook provides:
 * - saveDocument with loading/error state
 * - shareDocument with loading/error state
 * - lockDocument with loading/error state
 * - getVersions with loading/error state
 * - getAuditLogs with loading/error state
 *
 * All operations are async and non-blocking.
 */

import { useCallback, useState } from 'react'
import {
  saveDocument,
  saveDocumentVersion,
  lockDocument,
  unlockDocument,
  getDocumentVersions,
} from '@/lib/documents/documentStore'
import {
  createShareLink,
  getSharesByDocument,
  revokeShareLink,
  buildShareUrl,
} from '@/lib/documents/documentShare'
import {
  logDocumentView,
  logDocumentDownload,
  getDocumentAuditLogs,
} from '@/lib/documents/documentAudit'
import type {
  SaveDocumentParams,
  SaveDocumentVersionParams,
  LockDocumentParams,
  UnlockDocumentParams,
  CreateShareLinkParams,
  DocumentShareRow,
  DocumentVersionRow,
  DocumentAuditLogRow,
} from '@/lib/documents/document-types'

/* ─── useSaveDocument ──────────────────────────────────────── */

export function useSaveDocument() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async (params: SaveDocumentParams): Promise<string | null> => {
    setSaving(true)
    setError(null)
    try {
      const id = await saveDocument(params)
      return id
    } catch (err) {
      const msg = err instanceof Error ? err.message : '문서 저장에 실패했습니다.'
      setError(msg)
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  return { save, saving, error }
}

/* ─── useSaveDocumentVersion ──────────────────────────────── */

export function useSaveDocumentVersion() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveVersion = useCallback(async (params: SaveDocumentVersionParams): Promise<string | null> => {
    setSaving(true)
    setError(null)
    try {
      const id = await saveDocumentVersion(params)
      return id
    } catch (err) {
      const msg = err instanceof Error ? err.message : '버전 저장에 실패했습니다.'
      setError(msg)
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  return { saveVersion, saving, error }
}

/* ─── useShareDocument ────────────────────────────────────── */

export interface ShareResult {
  token: string
  url: string
}

export function useShareDocument() {
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const share = useCallback(async (params: CreateShareLinkParams): Promise<ShareResult | null> => {
    setSharing(true)
    setError(null)
    try {
      const token = await createShareLink(params)
      return { token, url: buildShareUrl(token) }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '공유 링크 생성에 실패했습니다.'
      setError(msg)
      return null
    } finally {
      setSharing(false)
    }
  }, [])

  const revoke = useCallback(async (shareId: string, userId: string): Promise<boolean> => {
    try {
      await revokeShareLink(shareId, userId)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : '공유 취소에 실패했습니다.'
      setError(msg)
      return false
    }
  }, [])

  const getShares = useCallback(async (documentId: string): Promise<DocumentShareRow[]> => {
    return getSharesByDocument(documentId)
  }, [])

  return { share, revoke, getShares, sharing, error }
}

/* ─── useLockDocument ──────────────────────────────────────── */

export function useLockDocument() {
  const [locking, setLocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lock = useCallback(async (params: LockDocumentParams): Promise<boolean> => {
    setLocking(true)
    setError(null)
    try {
      await lockDocument(params)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : '문서 잠금에 실패했습니다.'
      setError(msg)
      return false
    } finally {
      setLocking(false)
    }
  }, [])

  const unlock = useCallback(async (params: UnlockDocumentParams): Promise<boolean> => {
    setLocking(true)
    setError(null)
    try {
      await unlockDocument(params)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : '문서 잠금 해제에 실패했습니다.'
      setError(msg)
      return false
    } finally {
      setLocking(false)
    }
  }, [])

  return { lock, unlock, locking, error }
}

/* ─── useDocumentVersions ──────────────────────────────────── */

export function useDocumentVersions() {
  const [versions, setVersions] = useState<DocumentVersionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadVersions = useCallback(async (documentId: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDocumentVersions(documentId)
      setVersions(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '버전 정보를 불러오지 못했습니다.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  return { versions, loadVersions, loading, error }
}

/* ─── useDocumentAuditLog ─────────────────────────────────── */

export function useDocumentAuditLog() {
  const [logs, setLogs] = useState<DocumentAuditLogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = useCallback(async (documentId: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDocumentAuditLogs(documentId)
      setLogs(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '감사 로그를 불러오지 못했습니다.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  return { logs, loadLogs, loading, error }
}

/* ─── useDocumentView ──────────────────────────────────────── */

export function useDocumentView() {
  const trackView = useCallback(async (documentId: string, userId: string): Promise<void> => {
    try {
      await logDocumentView({ documentId, userId })
    } catch {
      // Silent fail — analytics should not break the app
    }
  }, [])

  const trackDownload = useCallback(async (documentId: string, userId: string): Promise<void> => {
    try {
      await logDocumentDownload(documentId, userId)
    } catch {
      // Silent fail
    }
  }, [])

  return { trackView, trackDownload }
}
