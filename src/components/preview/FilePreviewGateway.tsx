'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createSignedPreviewUrl } from '@/lib/storage/storage-helper'

interface DocumentRow {
  id: string
  site_id: string
  category: string
  title: string
  file_url: string | null
  file_type: string | null
  storage_bucket: string | null
  storage_path: string | null
}

interface FilePreviewGatewayProps {
  doc: DocumentRow
  onDownload?: () => void
}

type FileKind = 'pdf' | 'image' | 'unsupported'

function detectFileKind(fileType: string | null): FileKind {
  if (!fileType) return 'unsupported'
  const lower = fileType.toLowerCase()
  if (lower === 'pdf' || lower.includes('pdf')) return 'pdf'
  if (
    lower.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].some(ext =>
      lower.includes(ext)
    )
  )
    return 'image'
  return 'unsupported'
}

export function FilePreviewGateway({ doc, onDownload }: FilePreviewGatewayProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      setLoading(true)
      setError(null)

      try {
        let resolvedUrl: string | null = null

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
            resolvedUrl = signedUrl
          } else if (doc.file_url) {
            resolvedUrl = doc.file_url
          }
        } else if (doc.file_url) {
          resolvedUrl = doc.file_url
        }

        if (cancelled) return

        if (resolvedUrl) {
          setUrl(resolvedUrl)
        } else {
          setError('문서 미리보기를 불러오지 못했습니다.')
        }
      } catch {
        if (!cancelled) {
          if (doc.file_url) {
            setUrl(doc.file_url)
          } else {
            setError('문서 미리보기를 불러오지 못했습니다.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [doc])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
        <p>문서를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
        <p>{error}</p>
      </div>
    )
  }

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
        <p>파일을 불러올 수 없습니다.</p>
        <p className="mt-2 text-sm">파일 URL이 존재하지 않습니다.</p>
      </div>
    )
  }

  const kind = detectFileKind(doc.file_type)

  if (kind === 'pdf') {
    return (
      <iframe
        src={url}
        title={doc.title}
        className="w-full h-[calc(100dvh-200px)] border-0"
      />
    )
  }

  if (kind === 'image') {
    return (
      <div className="flex items-center justify-center py-4">
        <img
          src={url}
          alt={doc.title}
          className="max-w-full max-h-[calc(100dvh-200px)] object-contain rounded-lg"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
      <p className="font-medium text-[var(--color-text)]">{doc.title}</p>
      {doc.file_type && (
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
          파일 유형: {doc.file_type}
        </p>
      )}
      <p className="mt-3 text-sm">이 파일 형식은 미리보기를 지원하지 않습니다.</p>
      {onDownload && (
        <button
          onClick={onDownload}
          className="mt-4 px-4 py-2 bg-[var(--color-navy)] text-white text-sm rounded-lg hover:opacity-90 transition"
        >
          파일 다운로드
        </button>
      )}
    </div>
  )
}
