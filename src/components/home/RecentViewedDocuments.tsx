'use client'

import { useEffect, useState } from 'react'
import { FileText, ImageIcon, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createSignedPreviewUrl } from '@/lib/storage/storage-helper'
import { usePreview } from '@/components/preview'
import { isPartnerVisibleDocument as isPartnerSafeDocument } from '@/lib/documents/partnerDocuments'

interface RecentDocument {
  id: string
  site_id: string | null
  title: string
  category: string | null
  file_url: string | null
  file_type: string | null
  storage_bucket: string | null
  storage_path: string | null
  source_type: string | null
  approval_status: string | null
  locked_at: string | null
  created_at: string
  viewed_at?: string | null
  sites?: { name?: string | null } | null
}

function isPartnerVisibleDocument(doc: RecentDocument) {
  if (doc.category === '안전서류') return false
  return doc.approval_status === 'approved'
}

function isImage(type: string | null) {
  return !!type && (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].some(ext => type.toLowerCase().includes(ext)))
}

function DocumentPreview({ doc }: { doc: RecentDocument }) {
  const [url, setUrl] = useState<string | null>(doc.file_url)
  const [loading, setLoading] = useState(Boolean(doc.storage_bucket && doc.storage_path))

  useEffect(() => {
    let cancelled = false
    async function resolveUrl() {
      if (!doc.storage_bucket || !doc.storage_path) return
      setLoading(true)
      const supabase = createClient()
      const signedUrl = await createSignedPreviewUrl({
        supabase,
        bucket: doc.storage_bucket,
        path: doc.storage_path,
        expiresIn: 3600,
      })
      if (!cancelled) {
        setUrl(signedUrl ?? doc.file_url)
        setLoading(false)
      }
    }
    void resolveUrl()
    return () => {
      cancelled = true
    }
  }, [doc])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[var(--color-text-secondary)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.9} />
        문서를 불러오는 중입니다.
      </div>
    )
  }

  if (!url) {
    return <div className="py-16 text-center text-sm text-[var(--color-text-secondary)]">미리보기 URL이 없습니다.</div>
  }

  if (isImage(doc.file_type)) {
    return <img src={url} alt={doc.title} className="mx-auto max-h-[calc(100dvh-200px)] max-w-full rounded-lg object-contain" />
  }

  return <iframe src={url} title={doc.title} className="h-[calc(100dvh-200px)] w-full border-0" />
}

export function RecentViewedDocuments({
  userId,
  siteId,
  partnerMode = false,
  limit = 5,
}: {
  userId?: string | null
  siteId?: string | null
  partnerMode?: boolean
  limit?: number
}) {
  const { openPreview } = usePreview()
  const [documents, setDocuments] = useState<RecentDocument[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function loadDocuments() {
      setLoading(true)
      const supabase = createClient()

      if (!partnerMode) {
        const fromViews = await supabase
          .from('document_view_events')
          .select('viewed_at, documents(id, site_id, title, category, file_url, file_type, storage_bucket, storage_path, source_type, approval_status, locked_at, created_at, sites(name))')
          .eq('user_id', userId)
          .order('viewed_at', { ascending: false })
          .limit(limit)

        if (!cancelled && !fromViews.error && fromViews.data?.length) {
          const rows = fromViews.data
            .map(row => ({ ...(row.documents as unknown as RecentDocument), viewed_at: row.viewed_at as string }))
            .filter(doc => !siteId || doc.site_id === siteId)
            .slice(0, limit)
          setDocuments(rows)
          setLoading(false)
          return
        }
      }

      let fallbackQuery = supabase
        .from('documents')
        .select('id, site_id, title, category, file_url, file_type, storage_bucket, storage_path, source_type, approval_status, locked_at, created_at, sites(name)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (partnerMode) {
        fallbackQuery = fallbackQuery.eq('approval_status', 'approved').neq('category', '안전서류')
      }

      const fallback = await fallbackQuery
      let fallbackData = fallback.data as RecentDocument[] | null

      if (partnerMode) {
        let lockedQuery = supabase
          .from('documents')
          .select('id, site_id, title, category, file_url, file_type, storage_bucket, storage_path, source_type, approval_status, locked_at, created_at, sites(name)')
          .not('locked_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (siteId) {
          lockedQuery = lockedQuery.eq('site_id', siteId)
        }

        const locked = await lockedQuery
        if (!locked.error && locked.data?.length) {
          const byId = new Map<string, RecentDocument>()
          for (const row of fallbackData ?? []) byId.set(row.id, row)
          for (const row of locked.data as RecentDocument[]) byId.set(row.id, row)
          fallbackData = Array.from(byId.values())
        }
      }

      if (!cancelled) {
        const rows = (fallbackData ?? [])
          .filter(doc => !siteId || doc.site_id === siteId)
          .filter(doc => !partnerMode || isPartnerSafeDocument(doc))
          .slice(0, limit)
        setDocuments(rows)
        setLoading(false)
      }
    }

    void loadDocuments()
    return () => {
      cancelled = true
    }
  }, [partnerMode, siteId, userId])

  async function registerView(doc: RecentDocument) {
    if (!userId) return
    try {
      await createClient().from('document_view_events').insert({
        document_id: doc.id,
        user_id: userId,
        site_id: doc.site_id,
        viewed_at: new Date().toISOString(),
      })
    } catch {
      // The view event table is optional in older schemas.
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-sm text-[var(--color-text-secondary)]">최근 본 문서를 불러오는 중입니다.</div>
      </section>
    )
  }

  if (documents.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-1 text-lg font-semibold text-[var(--color-navy)]">최근 본 문서</div>
        <div className="text-sm text-[var(--color-text-secondary)]">
          최근에 확인한 문서가 아직 없습니다.
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-navy)]">최근 본 문서</h2>
        <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">{documents.length}건</span>
      </div>
      <div className="space-y-3">
        {documents.map(doc => {
          const Icon = isImage(doc.file_type) ? ImageIcon : FileText
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => {
                void registerView(doc)
                openPreview({
                  title: doc.title,
                  subtitle: [doc.sites?.name, doc.category, doc.file_type].filter(Boolean).join(' · '),
                  mode: 'fullscreen',
                  contentType: 'report',
                  dockMode: 'readonly',
                  showBack: false,
                  onClose: () => {},
                  children: <DocumentPreview doc={doc} />,
                })
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[var(--color-text)]">{doc.title}</span>
                <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">
                  {[doc.sites?.name, doc.category, doc.approval_status].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                보기
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
