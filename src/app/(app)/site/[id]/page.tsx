'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ExternalLink, MapPinned, Phone } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { isPartner } from '@/lib/roles'
import { ROUTES } from '@/lib/routes'
import { SiteStatusBadge } from '@/components/common/SiteStatusBadge'
import { FilePreviewGateway, usePreview } from '@/components/preview'

interface SiteDetail {
  id: string
  name: string
  company: string
  affiliation: string
  address: string
  accommodation_address: string | null
  manager: string
  manager_phone: string | null
  safety_manager: string | null
  safety_phone: string | null
  status: string
}

interface Photo {
  id: string
  thumbnail_url: string
  preview_url: string
}

interface Drawing {
  id: string
  original_path: string
  marked_path: string | null
}

interface SiteIssue {
  id: string
  title: string
  status: string
}

interface SiteDocument {
  id: string
  title: string
  category: string
  file_url: string
  approval_status: string | null
  locked_at: string | null
  source_type: string | null
}

export default function SiteDetailPage() {
  const params = useParams<{ id: string }>()
  const { user } = useAuth()
  const { openPreview } = usePreview()
  const supabase = createClient()

  const [site, setSite] = useState<SiteDetail | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [issues, setIssues] = useState<SiteIssue[]>([])
  const [documents, setDocuments] = useState<SiteDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id || !user) return

    async function fetchSiteDetail() {
      try {
        const partnerUser = isPartner(user?.role || '')
        let documentsQuery = supabase
          .from('documents')
          .select('id, title, category, file_url, approval_status, locked_at, source_type')
          .eq('site_id', params.id)

        if (partnerUser) {
          documentsQuery = documentsQuery
            .eq('approval_status', 'approved')
            .neq('category', '안전서류')
        }

        const [siteResponse, photosResponse, drawingsResponse, issuesResponse, documentsResponse] =
          await Promise.all([
            supabase.from('sites').select('*').eq('id', params.id).single(),
            partnerUser
              ? Promise.resolve({ data: [] })
              : supabase
                  .from('photos')
                  .select('id, thumbnail_url, preview_url')
                  .eq('site_id', params.id)
                  .order('created_at', { ascending: false })
                  .limit(9),
            partnerUser
              ? Promise.resolve({ data: [] })
              : supabase
                  .from('drawings')
                  .select('id, original_path, marked_path')
                  .eq('site_id', params.id)
                  .order('created_at', { ascending: false })
                  .limit(6),
            partnerUser
              ? Promise.resolve({ data: [] })
              : supabase
                  .from('issues')
                  .select('id, title, status')
                  .eq('site_id', params.id)
                  .order('updated_at', { ascending: false })
                  .limit(5),
            documentsQuery
              .order('created_at', { ascending: false })
              .limit(5),
          ])

        if (siteResponse.data) setSite(siteResponse.data)
        if (photosResponse.data) setPhotos(partnerUser ? [] : photosResponse.data)
        if (drawingsResponse.data) setDrawings(partnerUser ? [] : drawingsResponse.data)
        if (issuesResponse.data) setIssues(partnerUser ? [] : issuesResponse.data)
        if (documentsResponse.data) {
          const rows = documentsResponse.data as SiteDocument[]
          setDocuments(rows.filter(document => {
            if (!isPartner(user?.role || '')) return true
            if (document.category === '안전서류' || document.source_type === 'worker_required_document') return false
            return document.approval_status === 'approved' || Boolean(document.locked_at)
          }))
        }
      } catch (error) {
        console.error('Failed to fetch site detail:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchSiteDetail()
  }, [params.id, supabase, user])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">로딩 중...</div>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="space-y-4 p-4">
        <Link href={ROUTES.site} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.9} />
          <span>현장 목록으로</span>
        </Link>
        <div className="rounded-2xl bg-white p-6 text-center text-[var(--color-text-secondary)] shadow-sm">
          현장 정보를 찾을 수 없습니다.
        </div>
      </div>
    )
  }

  const isPartnerUser = isPartner(user?.role || '')

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const getFileName = (path: string) => path.split('/').pop() || path

  const getFileType = (path: string) => {
    const extension = path.split('.').pop()?.toLowerCase()
    if (!extension) return null
    if (extension === 'pdf') return 'pdf'
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
      return `image/${extension === 'jpg' ? 'jpeg' : extension}`
    }
    return extension
  }

  const openPhotoPreview = (photo: Photo) => {
    if (!photo.preview_url) return
    const title = getFileName(photo.preview_url)

    openPreview({
      title,
      subtitle: site.name,
      contentType: 'media',
      dockMode: 'readonly',
      onDownload: () => openInNewTab(photo.preview_url),
      children: (
        <div className="flex items-center justify-center py-4">
          <img
            src={photo.preview_url}
            alt={title}
            className="max-h-[calc(100dvh-200px)] max-w-full rounded-lg object-contain"
          />
        </div>
      ),
    })
  }

  const openFilePreview = (file: {
    id: string
    title: string
    category: string
    fileUrl: string
  }) => {
    if (!file.fileUrl) return

    openPreview({
      title: file.title,
      subtitle: file.category,
      contentType: 'file',
      dockMode: 'readonly',
      onDownload: () => openInNewTab(file.fileUrl),
      children: (
        <FilePreviewGateway
          doc={{
            id: file.id,
            site_id: site.id,
            title: file.title,
            category: file.category,
            file_url: file.fileUrl,
            file_type: getFileType(file.fileUrl),
            storage_bucket: null,
            storage_path: null,
          }}
          onDownload={() => openInNewTab(file.fileUrl)}
        />
      ),
    })
  }

  return (
    <div className="space-y-4 p-4">
      <Link href={ROUTES.site} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.9} />
        <span>현장 목록으로</span>
      </Link>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-navy)]">{site.name}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {site.company}
              {site.affiliation ? ` · ${site.affiliation}` : ''}
            </p>
          </div>

          <SiteStatusBadge status={site.status} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-[var(--color-bg)] p-4">
            <div className="mb-2 text-sm font-semibold text-[var(--color-navy)]">기본정보</div>
            <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              <div className="flex items-start gap-2">
                <MapPinned className="mt-0.5 h-4 w-4 text-[var(--color-accent)]" strokeWidth={1.9} />
                <span>{site.address || '주소 정보 없음'}</span>
              </div>
              {!isPartnerUser && site.accommodation_address && (
                <div>숙소 주소: {site.accommodation_address}</div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--color-bg)] p-4">
            <div className="mb-2 text-sm font-semibold text-[var(--color-navy)]">담당 연락처</div>
            <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--color-accent)]" strokeWidth={1.9} />
                <span>{site.manager || '현장 소장 미등록'}</span>
                {site.manager_phone && <span>{site.manager_phone}</span>}
              </div>
              {(site.safety_manager || site.safety_phone) && (
                <div>
                  안전 담당: {site.safety_manager || '-'}
                  {site.safety_phone ? ` / ${site.safety_phone}` : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-[var(--color-navy)]">사진</h2>
          <span className="text-sm text-[var(--color-text-secondary)]">{photos.length}개</span>
        </div>

        {photos.length === 0 ? (
          <div className="text-sm text-[var(--color-text-secondary)]">등록된 사진이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map(photo => (
              <a
                key={photo.id}
                href={photo.preview_url}
                target="_blank"
                rel="noreferrer"
                onClick={event => {
                  event.preventDefault()
                  openPhotoPreview(photo)
                }}
                className="block overflow-hidden rounded-xl bg-[var(--color-bg)]"
              >
                <img src={photo.thumbnail_url} alt="" className="aspect-square w-full object-cover" />
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-navy)]">도면</h2>
            <span className="text-sm text-[var(--color-text-secondary)]">{drawings.length}건</span>
          </div>

          {drawings.length === 0 ? (
            <div className="text-sm text-[var(--color-text-secondary)]">등록된 도면이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {drawings.map(drawing => (
                <a
                  key={drawing.id}
                  href={drawing.marked_path || drawing.original_path}
                  target="_blank"
                  rel="noreferrer"
                  onClick={event => {
                    event.preventDefault()
                    const fileUrl = drawing.marked_path || drawing.original_path
                    openFilePreview({
                      id: drawing.id,
                      title: getFileName(drawing.original_path),
                      category: '?꾨㈃',
                      fileUrl,
                    })
                  }}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-bg)]"
                >
                  <span className="truncate">{drawing.original_path.split('/').pop()}</span>
                  <ExternalLink className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-navy)]">조치사항</h2>
            <span className="text-sm text-[var(--color-text-secondary)]">{issues.length}건</span>
          </div>

          {issues.length === 0 ? (
            <div className="text-sm text-[var(--color-text-secondary)]">등록된 조치사항이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {issues.map(issue => (
                <div key={issue.id} className="rounded-xl border border-[var(--color-border)] px-3 py-2">
                  <div className="font-medium text-[var(--color-text)]">{issue.title}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{issue.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-[var(--color-navy)]">문서</h2>
          <span className="text-sm text-[var(--color-text-secondary)]">{documents.length}건</span>
        </div>

        {documents.length === 0 ? (
          <div className="text-sm text-[var(--color-text-secondary)]">등록된 문서가 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {documents.map(document => (
              <a
                key={document.id}
                href={document.file_url}
                target="_blank"
                rel="noreferrer"
                onClick={event => {
                  event.preventDefault()
                  openFilePreview({
                    id: document.id,
                    title: document.title,
                    category: document.category,
                    fileUrl: document.file_url,
                  })
                }}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-bg)]"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{document.title}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{document.category}</div>
                </div>
                <ExternalLink className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
