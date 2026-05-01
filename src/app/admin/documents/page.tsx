'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { approvePhotoSheetDocumentAndLock } from '@/lib/photo-sheet-approval'
import { createSignedPreviewUrl } from '@/lib/storage/storage-helper'
import { CheckCircle, Download, ExternalLink, FileText, Search, Trash2 } from 'lucide-react'

const CATEGORIES = [
  '전체', '일지보고서', '사진대지', '도면마킹', '안전서류', '견적서',
  '시공계획서', '장비계획서', '기타서류', '확인서'
]

interface Document {
  id: string
  site_id: string
  category: string
  title: string
  file_url: string | null
  file_type: string | null
  required: boolean
  uploaded_by: string | null
  created_at: string
  storage_bucket: string | null
  storage_path: string | null
  source_type: string | null
  source_id: string | null
  site_name?: string
  uploader_name?: string
  // Approval/Lock metadata (PR #36)
  approval_status: string | null
  approved_at: string | null
  approved_by: string | null
  locked_at: string | null
  locked_by: string | null
}

interface Site { id: string; name: string }

type DocumentRow = Omit<Document, 'site_name' | 'uploader_name'> & {
  site?: { name?: string } | Array<{ name?: string }> | null
  uploader?: { name?: string } | Array<{ name?: string }> | null
}

/**
 * Check if a document is a photo sheet document.
 * Identified by source_type = 'photo_sheet' or category = '사진대지'.
 */
function isPhotoSheetDocument(doc: Document): boolean {
  return doc.source_type === 'photo_sheet' || doc.category === '사진대지'
}

/**
 * Get the display label for approval status.
 */
function getApprovalStatusLabel(doc: Document): string | null {
  if (doc.approval_status === 'approved' || doc.locked_at) {
    return '승인완료'
  }
  if (doc.approval_status === 'rejected') {
    return '반려'
  }
  return '승인대기'
}

function hasResolvableDocumentUrl(doc: Document): boolean {
  return Boolean(doc.file_url || (doc.storage_bucket && doc.storage_path))
}

export default function AdminDocumentsPage() {
  const { user } = useAuth()
  const [docs, setDocs] = useState<Document[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('전체')
  const [siteFilter, setSiteFilter] = useState<string>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [resolvingDocId, setResolvingDocId] = useState<string | null>(null)
  const [approvingDocId, setApprovingDocId] = useState<string | null>(null)
  const supabase = createClient()

  const resolveDocumentUrl = useCallback(async (doc: Document): Promise<string | null> => {
    if (doc.storage_bucket && doc.storage_path) {
      try {
        const signedUrl = await createSignedPreviewUrl({
          supabase,
          bucket: doc.storage_bucket,
          path: doc.storage_path,
          expiresIn: 3600,
        })

        if (signedUrl) return signedUrl

        if (doc.file_url) {
          console.warn('[admin/documents] signed URL creation failed, using file_url fallback:', {
            documentId: doc.id,
            storageBucket: doc.storage_bucket,
            storagePath: doc.storage_path,
          })
        }
      } catch (error) {
        if (doc.file_url) {
          console.warn('[admin/documents] signed URL creation error, using file_url fallback:', {
            documentId: doc.id,
            storageBucket: doc.storage_bucket,
            storagePath: doc.storage_path,
            error,
          })
        }
      }
    }
    return doc.file_url
  }, [supabase])

  const handleOpenNewWindow = useCallback(async (doc: Document) => {
    setResolvingDocId(doc.id)
    try {
      const url = await resolveDocumentUrl(doc)
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setResolvingDocId(null)
    }
  }, [resolveDocumentUrl])

  const handleDownload = useCallback(async (doc: Document) => {
    setResolvingDocId(doc.id)
    try {
      const url = await resolveDocumentUrl(doc)
      if (url) {
        const a = document.createElement('a')
        a.href = url
        a.download = doc.title
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.click()
      }
    } finally {
      setResolvingDocId(null)
    }
  }, [resolveDocumentUrl])

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, { data: sitesData }] = await Promise.all([
      supabase.from('documents').select(`
        id, site_id, category, title, file_url, file_type, uploaded_by, created_at,
        storage_bucket, storage_path, source_type, source_id,
        approval_status, approved_at, approved_by, locked_at, locked_by,
        site:sites(name),
        uploader:workers(name)
      `).order('created_at', { ascending: false }).limit(300),
      supabase.from('sites').select('id, name').order('name'),
    ])

    if (!error && data) {
      const mappedDocs: Document[] = (data as DocumentRow[]).map(doc => {
        const site = Array.isArray(doc.site) ? doc.site[0] : doc.site
        const uploader = Array.isArray(doc.uploader) ? doc.uploader[0] : doc.uploader

        return {
          id: doc.id,
          site_id: doc.site_id,
          category: doc.category,
          title: doc.title,
          file_url: doc.file_url,
          file_type: doc.file_type,
          required: false,
          uploaded_by: doc.uploaded_by,
          created_at: doc.created_at,
          storage_bucket: doc.storage_bucket,
          storage_path: doc.storage_path,
          source_type: doc.source_type,
          source_id: doc.source_id,
          site_name: site?.name,
          uploader_name: uploader?.name,
          // Approval/Lock metadata (PR #36)
          approval_status: doc.approval_status ?? null,
          approved_at: doc.approved_at ?? null,
          approved_by: doc.approved_by ?? null,
          locked_at: doc.locked_at ?? null,
          locked_by: doc.locked_by ?? null,
        }
      })

      setDocs(mappedDocs)
    }
    if (sitesData) setSites(sitesData)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id)
    const doc = docs.find(d => d.id === id)
    if (doc) {
      if (doc.storage_bucket && doc.storage_path) {
        await supabase.storage.from(doc.storage_bucket).remove([doc.storage_path]).catch(() => {})
      } else if (doc.file_url) {
        const legacyPath = doc.file_url.replace(/.*\/storage\/v1\/object\/public\/documents\//, '')
        if (legacyPath && legacyPath !== doc.file_url) {
          await supabase.storage.from('documents').remove([legacyPath]).catch(() => {})
        }
      }
    }
    await supabase.from('documents').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
    setDeleting(null)
    setConfirmDelete(null)
  }, [supabase, docs])

  /**
   * Approve a photo sheet document.
   * Sets approval_status to 'approved' and locks the document.
   */
  const handleApprovePhotoSheetDocument = useCallback(async (doc: Document) => {
    if (!isPhotoSheetDocument(doc)) return
    if (doc.approval_status === 'approved' || doc.locked_at) return
    if (!user?.userId) return

    setApprovingDocId(doc.id)

    try {
      const result = await approvePhotoSheetDocumentAndLock({
        documentId: doc.id,
        actorId: user.userId,
      })

      setDocs(prev =>
        prev.map(item =>
          item.id === doc.id
            ? {
                ...item,
                approval_status: 'approved',
                approved_at: result.approvedAt,
                approved_by: result.actorId,
                locked_at: result.approvedAt,
                locked_by: result.actorId,
              }
            : item
        )
      )
    } catch (error) {
      console.error('[admin/documents] failed to approve photo sheet document:', error)
    } finally {
      setApprovingDocId(null)
    }
  }, [user?.userId])

  const filtered = docs.filter(d => {
    if (categoryFilter !== '전체' && d.category !== categoryFilter) return false
    if (siteFilter !== 'all' && d.site_id !== siteFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return d.title.toLowerCase().includes(q) || d.site_name?.toLowerCase().includes(q)
    }
    return true
  })

  const categoryCounts: Record<string, number> = {}
  docs.forEach(d => {
    categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)]">문서/안전서류</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">총 {docs.length}개 문서</p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => {
          const count = cat === '전체' ? docs.length : (categoryCounts[cat] || 0)
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                categoryFilter === cat
                  ? 'bg-[var(--color-navy)] text-white'
                  : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)]'
              }`}
            >
              {cat} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.9} />
          <input
            type="text"
            placeholder="문서명, 현장명 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <select
          value={siteFilter}
          onChange={e => setSiteFilter(e.target.value)}
          className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
        >
          <option value="all">전체 현장</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-2">문서 삭제</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              이 문서를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition">취소</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting === confirmDelete}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleting === confirmDelete ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">문서가 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">문서명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">분류</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">현장</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">업로더</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">필수</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">승인</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(d => {
                  const isPhotoSheet = isPhotoSheetDocument(d)
                  const approvalLabel = isPhotoSheet ? getApprovalStatusLabel(d) : null
                  const canApprove = isPhotoSheet && d.approval_status !== 'approved' && !d.locked_at
                  const isApproving = approvingDocId === d.id

                  return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.9} />
                        <span className="text-sm font-medium">{d.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{d.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.site_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.uploader_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.created_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-center">
                      {d.required
                        ? <span className="text-xs text-red-500 font-medium">필수</span>
                        : <span className="text-xs text-gray-400">선택</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isPhotoSheet && approvalLabel ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          approvalLabel === '승인완료'
                            ? 'bg-green-100 text-green-700'
                            : approvalLabel === '반려'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {approvalLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenNewWindow(d)}
                          disabled={resolvingDocId === d.id || !hasResolvableDocumentUrl(d)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition disabled:opacity-50"
                          title="새 창에서 열기"
                        >
                          <ExternalLink className="h-4 w-4" strokeWidth={1.9} />
                        </button>
                        <button
                          onClick={() => handleDownload(d)}
                          disabled={resolvingDocId === d.id || !hasResolvableDocumentUrl(d)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-blue-600 transition disabled:opacity-50"
                          title="다운로드"
                        >
                          <Download className="h-4 w-4" strokeWidth={1.9} />
                        </button>
                        {canApprove && (
                          <button
                            onClick={() => void handleApprovePhotoSheetDocument(d)}
                            disabled={isApproving}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition disabled:opacity-50"
                            title="사진대지 승인"
                          >
                            {isApproving ? (
                              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <CheckCircle className="h-4 w-4" strokeWidth={2} />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(d.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
