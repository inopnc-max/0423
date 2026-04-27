'use client'

import { useEffect, useState } from 'react'
import { useSelectedSite } from '@/contexts/selected-site-context'
import { useMenuSearch } from '@/hooks/useMenuSearch'
import { Search, X } from 'lucide-react'
import { PreviewCenter } from '@/components/preview'
import { createClient } from '@/lib/supabase/client'
import { createSignedPreviewUrl } from '@/lib/storage/storage-helper'
import { useAuth } from '@/contexts/auth-context'
import { isPartner } from '@/lib/roles'

const CATEGORIES = ['전체', '일지보고서', '사진대지', '도면마킹', '안전서류', '견적서', '시공계획서', '장비계획서', '기타서류', '확인서']
const APPROVAL_FILTERS = ['전체', '승인완료', '승인대기', '반려']

interface DocumentRow {
  id: string
  site_id: string
  category: string
  title: string
  file_url: string | null
  file_type: string | null
  created_at: string
  storage_bucket: string | null
  storage_path: string | null
  source_type: string | null
  source_id: string | null
  approval_status: string | null
  locked_at: string | null
}

function isPhotoSheetDocument(doc: DocumentRow): boolean {
  return doc.source_type === 'photo_sheet' || doc.category === '사진대지'
}

function getApprovalStatusLabel(doc: DocumentRow): string | null {
  if (!isPhotoSheetDocument(doc)) return null
  if (doc.approval_status === 'approved' || doc.locked_at) return '승인완료'
  if (doc.approval_status === 'rejected') return '반려'
  return '승인대기'
}

export default function DocumentsPage() {
  const { selectedSiteId } = useSelectedSite()
  const { user } = useAuth()
  const [category, setCategory] = useState('전체')
  const [approvalFilter, setApprovalFilter] = useState('전체')
  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewUrlLoading, setPreviewUrlLoading] = useState(false)
  const [previewUrlError, setPreviewUrlError] = useState<string | null>(null)

  const {
    query,
    setQuery,
    filteredDocuments,
    loading,
    error,
    clear,
  } = useMenuSearch({ scope: 'documents' })

  /* ─── Category + approval + partner filter ─── */

  const displayed = (() => {
    const isPartnerUser = user ? isPartner(user.role) : false

    // Step 1: Apply partner filter (only for photo sheet documents)
    let docs = filteredDocuments
    if (isPartnerUser) {
      docs = docs.filter(doc => {
        if (!isPhotoSheetDocument(doc)) return true
        return doc.approval_status === 'approved' || doc.locked_at
      })
    }

    // Step 2: Apply category filter
    if (category !== '전체') {
      docs = docs.filter(doc => doc.category === category)
    }

    // Step 3: Apply approval status filter (only for photo sheet documents)
    if (approvalFilter !== '전체') {
      docs = docs.filter(doc => {
        if (!isPhotoSheetDocument(doc)) return false
        const label = getApprovalStatusLabel(doc)
        return label === approvalFilter
      })
    }

    return docs
  })()

  /* ─── Preview handlers ─── */

  function handleDocClick(doc: DocumentRow) {
    setPreviewUrl(null)
    setPreviewUrlError(null)
    setPreviewDoc(doc)
  }

  /* ─── Signed URL generation ─── */

  useEffect(() => {
    if (!previewDoc) {
      setPreviewUrl(null)
      setPreviewUrlError(null)
      setPreviewUrlLoading(false)
      return
    }

    let cancelled = false
    const doc = previewDoc

    async function resolvePreviewUrl() {
      setPreviewUrlLoading(true)
      setPreviewUrlError(null)

      try {
        // Use storage metadata if available
        if (doc.storage_bucket && doc.storage_path) {
          const supabase = createClient()
          const signedUrl = await createSignedPreviewUrl({
            supabase,
            bucket: doc.storage_bucket,
            path: doc.storage_path,
            expiresIn: 3600,
          })

          if (cancelled) return

          if (signedUrl) {
            setPreviewUrl(signedUrl)
          } else if (doc.file_url) {
            // Fallback to file_url if signed URL fails
            setPreviewUrl(doc.file_url)
          } else {
            setPreviewUrl(null)
            setPreviewUrlError('문서 미리보기를 불러오지 못했습니다.')
          }
        } else if (doc.file_url) {
          // No storage metadata, use file_url directly
          setPreviewUrl(doc.file_url)
        } else {
          setPreviewUrl(null)
          setPreviewUrlError('파일 URL이 존재하지 않습니다.')
        }
      } catch {
        if (!cancelled) {
          if (doc.file_url) {
            setPreviewUrl(doc.file_url)
            setPreviewUrlError(null)
          } else {
            setPreviewUrlError('문서 미리보기를 불러오지 못했습니다.')
            setPreviewUrl(null)
          }
        }
      } finally {
        if (!cancelled) setPreviewUrlLoading(false)
      }
    }

    void resolvePreviewUrl()
    return () => {
      cancelled = true
    }
  }, [previewDoc])

  function handleDownload() {
    const doc = previewDoc
    if (!doc) return
    const downloadUrl = previewUrl ?? doc.file_url
    if (!downloadUrl) return
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = doc.title
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  /* ─── Empty states ─── */

  if (!selectedSiteId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center text-[var(--color-text-secondary)]">
          먼저 홈에서 현장을 선택해주세요.
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-4">
        <h1 className="text-xl font-bold text-[var(--color-navy)] mb-4">문서함</h1>

        {/* Search Input */}
        <div className="flex items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-white px-3 py-2 mb-4">
          <Search className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
          <input
            type="text"
            placeholder="문서명, 카테고리, 파일유형 검색..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="rounded-full p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)]"
            >
              <X className="h-4 w-4" strokeWidth={1.9} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                category === cat
                  ? 'bg-[var(--color-navy)] text-white'
                  : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Approval Status Filter Tabs (for photo sheet documents) */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {APPROVAL_FILTERS.map(filter => (
            <button
              key={filter}
              onClick={() => setApprovalFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                approvalFilter === filter
                  ? filter === '승인완료'
                    ? 'bg-green-600 text-white'
                    : filter === '승인대기'
                    ? 'bg-yellow-500 text-white'
                    : filter === '반려'
                    ? 'bg-red-500 text-white'
                    : 'bg-[var(--color-navy)] text-white'
                  : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-[var(--color-text-secondary)]">문서를 불러오는 중...</div>
          </div>
        )}

        {/* Document List */}
        {!loading && displayed.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            {query ? '검색 결과가 없습니다.' : '문서가 없습니다.'}
          </div>
        )}

        {!loading && displayed.length > 0 && (
          <div className="space-y-3">
            {displayed.map((doc: DocumentRow) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => handleDocClick(doc)}
                className={`w-full text-left bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition ${
                  !doc.file_url ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{doc.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isPhotoSheetDocument(doc) && (
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                          getApprovalStatusLabel(doc) === '승인완료'
                            ? 'bg-green-100 text-green-700'
                            : getApprovalStatusLabel(doc) === '반려'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {getApprovalStatusLabel(doc)}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {doc.category}
                      </span>
                      {doc.file_type && (
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded">
                          {doc.file_type}
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PreviewCenter — documents from search results */}
      {previewDoc && (
        <PreviewCenter
          mode="fullscreen"
          contentType="report"
          title={previewDoc.title}
          subtitle={[previewDoc.category, previewDoc.file_type].filter(Boolean).join(' · ')}
          showBack={false}
          onClose={() => { setPreviewDoc(null); setPreviewUrl(null); setPreviewUrlError(null) }}
          onBack={() => { setPreviewDoc(null); setPreviewUrl(null); setPreviewUrlError(null) }}
          dockMode="readonly"
          onDownload={previewDoc.file_url || previewUrl ? handleDownload : undefined}
        >
          {previewUrlLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
              <p>문서를 불러오는 중...</p>
            </div>
          ) : previewUrlError ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
              <p>문서 미리보기를 불러오지 못했습니다.</p>
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              title={previewDoc.title}
              className="w-full h-[calc(100dvh-200px)] border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
              <p>파일을 불러올 수 없습니다.</p>
              <p className="mt-2 text-sm">파일 URL이 존재하지 않습니다.</p>
            </div>
          )}
        </PreviewCenter>
      )}
    </>
  )
}
