'use client'

import { useCallback, useState } from 'react'
import { X, Link2, Copy, Trash2, Calendar, Users, Building2, Globe, Check, Loader2 } from 'lucide-react'
import { useShareDocument } from '@/hooks/useDocumentActions'
import type { DocumentShareRow } from '@/lib/documents/document-types'

interface ShareBottomSheetProps {
  documentId: string
  documentTitle: string
  userId: string
  onClose: () => void
  onRevoked?: () => void
}

type ShareScope = 'site' | 'company' | 'public'

const SCOPE_OPTIONS: { value: ShareScope; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'site',
    label: '현장 공유',
    icon: <Building2 className="h-4 w-4" />,
    description: '같은 현장 소속 사용자만 열람 가능',
  },
  {
    value: 'company',
    label: '회사 공유',
    icon: <Users className="h-4 w-4" />,
    description: '같은 회사에 속한 사용자만 열람 가능',
  },
  {
    value: 'public',
    label: '링크 공유',
    icon: <Globe className="h-4 w-4" />,
    description: '링크를 가진 모든 사용자가 열람 가능',
  },
]

/**
 * ShareBottomSheet - Document share link creation and management sheet.
 *
 * Features:
 * - Create share link with scope selection
 * - Copy share link to clipboard
 * - View active shares
 * - Revoke shares
 * - Web Share API integration
 */
export function ShareBottomSheet({
  documentId,
  documentTitle,
  userId,
  onClose,
  onRevoked,
}: ShareBottomSheetProps) {
  const [scope, setScope] = useState<ShareScope>('site')
  const [allowDownload, setAllowDownload] = useState(false)
  const [expiresIn, setExpiresIn] = useState<string>('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [shares, setShares] = useState<DocumentShareRow[]>([])
  const [loadingShares, setLoadingShares] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const { share, revoke, getShares, sharing } = useShareDocument()

  const loadShares = useCallback(async () => {
    setLoadingShares(true)
    try {
      const data = await getShares(documentId)
      setShares(data)
    } finally {
      setLoadingShares(false)
    }
  }, [documentId, getShares])

  const handleCreateShare = useCallback(async () => {
    const expiresAt = expiresIn
      ? new Date(Date.now() + parseInt(expiresIn, 10) * 24 * 60 * 60 * 1000).toISOString()
      : null

    const result = await share({
      documentId,
      sharedBy: userId,
      shareScope: scope,
      allowDownload,
      expiresAt,
    })

    if (result) {
      void loadShares()
    }
  }, [documentId, userId, scope, allowDownload, expiresIn, share, loadShares])

  const handleCopyLink = useCallback(async (token: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    }
  }, [])

  const handleWebShare = useCallback(async (token: string, url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: documentTitle,
          text: `${documentTitle} 문서를 확인하세요.`,
          url,
        })
      } catch {
        // User cancelled or share failed
      }
    }
  }, [documentTitle])

  const handleRevoke = useCallback(async (shareId: string) => {
    setRevokingId(shareId)
    try {
      const ok = await revoke(shareId, userId)
      if (ok) {
        await loadShares()
        onRevoked?.()
      }
    } finally {
      setRevokingId(null)
    }
  }, [revoke, userId, loadShares, onRevoked])

  const scopeLabel = SCOPE_OPTIONS.find(s => s.value === scope)?.label ?? '공유'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white shadow-2xl">
        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-[var(--color-border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-navy)]">문서 공유</h2>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)] truncate max-w-[260px]">
              {documentTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)] transition"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70dvh] overflow-y-auto px-5 pb-6 space-y-4">
          {/* Scope Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">공유 범위</label>
            <div className="grid grid-cols-3 gap-2">
              {SCOPE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setScope(option.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition ${
                    scope === option.value
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                  }`}
                >
                  <span className={scope === option.value ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)]'}>
                    {option.icon}
                  </span>
                  <span className={`text-xs font-semibold ${scope === option.value ? 'text-[var(--color-navy)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {option.label}
                  </span>
                  <span className="text-[9px] text-[var(--color-text-tertiary)] leading-tight">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Allow Download */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={e => setAllowDownload(e.target.checked)}
              className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <span className="text-sm text-[var(--color-text-primary)]">다운로드 허용</span>
          </label>

          {/* Expiry */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
              <Calendar className="h-4 w-4" />
              만료일 (선택)
            </label>
            <select
              value={expiresIn}
              onChange={e => setExpiresIn(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">만료 없음</option>
              <option value="1">1일</option>
              <option value="7">7일</option>
              <option value="30">30일</option>
              <option value="90">90일</option>
            </select>
          </div>

          {/* Create Button */}
          <button
            type="button"
            onClick={handleCreateShare}
            disabled={sharing}
            className="w-full rounded-xl bg-[var(--color-navy)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)] disabled:opacity-60"
          >
            {sharing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                공유 링크 생성 중...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Link2 className="h-4 w-4" />
                {scopeLabel} 링크 생성
              </span>
            )}
          </button>

          {/* Active Shares */}
          {shares.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">활성 공유 링크</h3>
              <div className="space-y-2">
                {shares.map(s => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${s.share_token}`
                  const isCopied = copiedToken === s.share_token
                  const isRevoking = revokingId === s.id
                  const isExpired = !!(s.expires_at && new Date(s.expires_at) < new Date())

                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 ${
                        isExpired ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                            {s.share_scope === 'site' ? '현장' : s.share_scope === 'company' ? '회사' : '링크'}
                          </span>
                          {s.allow_download && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">
                              다운로드 허용
                            </span>
                          )}
                          {isExpired && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                              만료됨
                            </span>
                          )}
                        </div>
                        {s.expires_at && (
                          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                            만료: {new Date(s.expires_at).toLocaleDateString('ko-KR')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(s.share_token, url)}
                          disabled={isExpired}
                          className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg-highlight)] disabled:opacity-50"
                          title="링크 복사"
                        >
                          {isCopied ? (
                            <span className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> 복사됨</span>
                          ) : (
                            <span className="flex items-center gap-1"><Copy className="h-3 w-3" /> 복사</span>
                          )}
                        </button>
                        {'share' in navigator && (
                          <button
                            type="button"
                            onClick={() => handleWebShare(s.share_token, url)}
                            disabled={isExpired}
                            className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg-highlight)] disabled:opacity-50"
                            title="공유"
                          >
                            공유
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRevoke(s.id)}
                          disabled={isRevoking || isExpired}
                          className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          title="공유 취소"
                        >
                          {isRevoking ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
