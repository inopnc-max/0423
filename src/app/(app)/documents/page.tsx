'use client'

import { useState } from 'react'
import { useSelectedSite } from '@/contexts/selected-site-context'
import { useMenuSearch } from '@/hooks/useMenuSearch'
import { Search, X } from 'lucide-react'
import { PreviewCenter } from '@/components/preview'

const CATEGORIES = ['전체', '일지보고서', '사진대지', '도면마킹', '안전서류', '견적서', '시공계획서', '장비계획서', '기타서류', '확인서']

interface DocumentRow {
  id: string
  site_id: string
  category: string
  title: string
  file_url: string | null
  file_type: string | null
  created_at: string
}

export default function DocumentsPage() {
  const { selectedSiteId } = useSelectedSite()
  const [category, setCategory] = useState('전체')
  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null)

  const {
    query,
    setQuery,
    filteredDocuments,
    loading,
    error,
    clear,
  } = useMenuSearch({ scope: 'documents' })

  /* ─── Category + search combined filter ─── */

  const displayed = (() => {
    const docs = filteredDocuments
    if (category === '전체') return docs
    return docs.filter(doc => doc.category === category)
  })()

  /* ─── Preview handlers ─── */

  function handleDocClick(doc: DocumentRow) {
    setPreviewDoc(doc)
  }

  function handleDownload() {
    const doc = previewDoc
    if (!doc?.file_url) return
    const a = document.createElement('a')
    a.href = doc.file_url
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
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
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
                    <div className="flex items-center gap-2 mt-1">
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
          onClose={() => setPreviewDoc(null)}
          onBack={() => setPreviewDoc(null)}
          dockMode="readonly"
          onDownload={previewDoc.file_url ? handleDownload : undefined}
        >
          {previewDoc.file_url ? (
            <iframe
              src={previewDoc.file_url}
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
