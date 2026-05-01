'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  ClipboardList,
  FileText,
  HardHat,
  House,
  Image,
  Search as SearchIcon,
  TriangleAlert,
  X,
  CalendarDays,
  Settings,
  Package,
  MessageSquareMore,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { isPartner } from '@/lib/roles'
import { ROUTES, canAccessRoute } from '@/lib/routes'
import { FilePreviewGateway, usePreview } from '@/components/preview'
import type { MenuSearchPreviewPayload } from '@/lib/menu-search'
import type { PreviewContentType } from '@/components/preview/preview-types'

interface SearchResult {
  entity_type: 'site' | 'worker' | 'document' | 'worklog' | 'issue' | 'drawing'
  entity_id: string
  title: string
  subtitle: string
  href: string
  previewPayload?: MenuSearchPreviewPayload
  preview_payload?: MenuSearchPreviewPayload
}

const QUICK_LINKS = [
  { href: ROUTES.home, label: '홈', icon: House },
  { href: ROUTES.worklog, label: '일지 작성', icon: ClipboardList },
  { href: ROUTES.site, label: '현장 보기', icon: Building2 },
  { href: ROUTES.output, label: '출역 현황', icon: CalendarDays },
  { href: ROUTES.materials, label: '자재관리', icon: Package },
  { href: ROUTES.hqRequests, label: '본사요청', icon: MessageSquareMore },
  { href: ROUTES.settings, label: '설정', icon: Settings },
]

export default function SearchPage() {
  const { user } = useAuth()
  const { openPreview } = usePreview()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const requestIdRef = useRef(0)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const entityMeta = useMemo(
    () => ({
      site: { label: '현장', icon: Building2, colorClass: 'bg-blue-50 text-blue-600' },
      worker: { label: '작업자', icon: HardHat, colorClass: 'bg-violet-50 text-violet-600' },
      document: { label: '문서', icon: FileText, colorClass: 'bg-green-50 text-green-600' },
      worklog: { label: '일지', icon: ClipboardList, colorClass: 'bg-orange-50 text-orange-600' },
      issue: { label: '조치사항', icon: TriangleAlert, colorClass: 'bg-red-50 text-red-600' },
      drawing: { label: '도면', icon: Image, colorClass: 'bg-indigo-50 text-indigo-600' },
    }),
    []
  )

  const search = useCallback(
    async (value: string) => {
      if (value.trim().length < 2) {
        setResults([])
        setLoading(false)
        return
      }

      const currentRequestId = requestIdRef.current + 1
      requestIdRef.current = currentRequestId
      setLoading(true)

      try {
        const { data, error } = await supabase.rpc('search_unified', {
          p_query: value,
          p_user_id: user?.userId,
          p_limit: 10,
        })

        if (requestIdRef.current !== currentRequestId) return

        if (!error && data) {
          const rows = (data as SearchResult[]).filter(result => {
            if (!isPartner(user?.role || '')) return true
            return result.entity_type === 'site'
          })
          setResults(rows)
          setSelectedIndex(0)
          return
        }

        setResults([])
      } catch (error) {
        if (requestIdRef.current === currentRequestId) {
          console.error('Unified search failed:', error)
          setResults([])
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false)
        }
      }
    },
    [supabase, user]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void search(query)
    }, 280)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex(previous => Math.min(previous + 1, Math.max(results.length - 1, 0)))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex(previous => Math.max(previous - 1, 0))
      return
    }

    if (event.key === 'Enter' && results[selectedIndex]) {
      event.preventDefault()
      handleResultOpen(results[selectedIndex])
    }
  }

  function getPreviewPayload(result: SearchResult): MenuSearchPreviewPayload | undefined {
    return result.previewPayload ?? result.preview_payload
  }

  function getPreviewContentType(kind: MenuSearchPreviewPayload['kind']): PreviewContentType {
    return kind === 'photo' ? 'media' : 'file'
  }

  function getPreviewMimeType(payload: MenuSearchPreviewPayload): string | null {
    return payload.kind === 'document' ? payload.mimeType ?? null : null
  }

  function openResultFallback(result: SearchResult) {
    window.location.href = result.href
  }

  function handleResultOpen(result: SearchResult) {
    if (isPartner(user?.role || '') && result.entity_type !== 'site') {
      openResultFallback(result)
      return
    }

    const payload = getPreviewPayload(result)

    if (!payload || !payload.url) {
      openResultFallback(result)
      return
    }

    const handleDownload = () => {
      window.open(payload.url, '_blank', 'noopener,noreferrer')
    }

    openPreview({
      title: payload.title || result.title,
      subtitle: result.subtitle,
      mode: 'fullscreen',
      contentType: getPreviewContentType(payload.kind),
      dockMode: 'readonly',
      showBack: false,
      onDownload: handleDownload,
      children: (
        <FilePreviewGateway
          doc={{
            id: payload.sourceId ?? result.entity_id,
            site_id: payload.siteId ?? '',
            category: payload.kind,
            title: payload.title || result.title,
            file_url: payload.url,
            file_type: getPreviewMimeType(payload),
            storage_bucket: null,
            storage_path: payload.storagePath ?? null,
          }}
          onDownload={handleDownload}
        />
      ),
    })
  }

  function handleResultClick(event: React.MouseEvent<HTMLAnchorElement>, result: SearchResult) {
    if (!getPreviewPayload(result)) return
    event.preventDefault()
    handleResultOpen(result)
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-navy)]">통합검색</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          현장, 작업자, 문서, 일지, 도면, 조치사항을 한 번에 찾을 수 있습니다.
        </p>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <SearchIcon className={`h-5 w-5 ${loading ? 'animate-pulse text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)]'}`} strokeWidth={1.9} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="2자 이상 입력해 검색하세요"
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white py-3 pl-12 pr-12 text-base outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)]"
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-4 flex items-center text-[var(--color-text-tertiary)] transition hover:text-[var(--color-text)]"
            aria-label="검색어 지우기"
          >
            <X className="h-5 w-5" strokeWidth={1.9} />
          </button>
        )}
      </div>

      {query.length >= 2 && results.length === 0 && !loading && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-text-secondary)] shadow-sm">
          검색 결과가 없습니다.
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {results.map((result, index) => {
            const meta = entityMeta[result.entity_type]
            const Icon = meta.icon

            return (
              <Link
                key={`${result.entity_type}-${result.entity_id}`}
                href={result.href}
                onClick={event => handleResultClick(event, result)}
                className={`flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 transition last:border-b-0 ${
                  index === selectedIndex ? 'bg-[var(--color-accent-light)]' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.colorClass}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold text-[var(--color-text)]">{result.title}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
                      {meta.label}
                    </span>
                  </div>
                  {result.subtitle && (
                    <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">{result.subtitle}</p>
                  )}
                </div>

                <ArrowRight className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
              </Link>
            )
          })}
        </div>
      )}

      {query.length === 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]">빠른 메뉴</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.filter(item => {
              if (isPartner(user?.role || '')) {
                return item.href !== ROUTES.worklog && item.href !== ROUTES.materials && item.href !== ROUTES.output
              }
              return canAccessRoute(item.href, user?.role || '')
            }).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </div>
                <span className="text-sm font-semibold text-[var(--color-text)]">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
