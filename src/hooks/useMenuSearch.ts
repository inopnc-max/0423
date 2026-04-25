'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelectedSite } from '@/contexts/selected-site-context'
import { createClient } from '@/lib/supabase/client'
import type {
  MenuSearchResult,
  MenuSearchOptions,
  MenuSearchScope,
  SiteSummary,
  MenuSearchPreviewPayload,
} from '@/lib/menu-search'

/* ─── Site Filter (client-side) ─── */

function filterSites(sites: SiteSummary[], query: string): SiteSummary[] {
  if (!query.trim()) return sites
  const q = query.toLowerCase()
  return sites.filter(
    s =>
      s.name.toLowerCase().includes(q) ||
      s.company.toLowerCase().includes(q) ||
      s.affiliation.toLowerCase().includes(q) ||
      (s.address ?? '').toLowerCase().includes(q)
  )
}

function sitesToResults(sites: SiteSummary[], scope: MenuSearchScope): MenuSearchResult[] {
  return sites.map(site => ({
    id: site.id,
    scope,
    type: 'site' as const,
    title: site.name,
    subtitle: [site.company, site.affiliation].filter(Boolean).join(' · '),
    siteId: site.id,
    route: `/site/${site.id}`,
  }))
}

function docsToResults(docs: DocumentRow[], scope: MenuSearchScope): MenuSearchResult[] {
  return docs.map(doc => {
    const payload: MenuSearchPreviewPayload = {
      kind: 'document',
      title: doc.title,
      url: doc.file_url ?? undefined,
      mimeType: doc.file_type ?? undefined,
      siteId: doc.site_id,
      sourceId: doc.id,
    }
    return {
      id: doc.id,
      scope,
      type: 'document' as const,
      title: doc.title,
      subtitle: [doc.category, doc.file_type].filter(Boolean).join(' · '),
      siteId: doc.site_id,
      previewPayload: payload,
    }
  })
}

/* ─── Document row from Supabase ─── */

interface DocumentRow {
  id: string
  site_id: string
  category: string
  title: string
  file_url: string | null
  file_type: string | null
  created_at: string
}

/* ─── Hook Return ─── */

export interface UseMenuSearchReturn {
  query: string
  setQuery: (q: string) => void
  scope: MenuSearchScope
  /** SiteSummary[] for combobox rendering (site_select scope) */
  filteredSites: SiteSummary[]
  /** MenuSearchResult[] for search result display */
  filteredResults: MenuSearchResult[]
  /** DocumentRow[] for documents page (documents scope) */
  filteredDocuments: DocumentRow[]
  loading: boolean
  error: string | null
  clear: () => void
}

/* ─── Hook ─── */

export function useMenuSearch(options: MenuSearchOptions): UseMenuSearchReturn {
  const { scope } = options

  const { accessibleSites, selectedSiteId } = useSelectedSite()
  const [query, setQueryState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentResults, setDocumentResults] = useState<DocumentRow[]>([])

  const supabase = useMemo(() => createClient(), [])
  const queryRef = useRef(query)
  queryRef.current = query

  const setQuery = useCallback((q: string) => {
    setQueryState(q)
  }, [])

  const clear = useCallback(() => {
    setQueryState('')
    setDocumentResults([])
    setError(null)
  }, [])

  /* ─── Documents search — async Supabase query ─── */

  useEffect(() => {
    if (scope !== 'documents') return
    if (!selectedSiteId) {
      setDocumentResults([])
      setLoading(false)
      return
    }

    const q = query.trim()
    const minLen = options.minQueryLength ?? 2
    if (q.length > 0 && q.length < minLen) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    async function search() {
      try {
        let dbQuery = supabase
          .from('documents')
          .select('id, site_id, category, title, file_url, file_type, created_at')
          .eq('site_id', selectedSiteId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (q.length > 0) {
          dbQuery = dbQuery.or(
            `title.ilike.%${q}%,category.ilike.%${q}%,file_type.ilike.%${q}%`
          )
        }

        const { data, error: dbError } = await dbQuery

        if (cancelled) return

        if (dbError) {
          setError('문서를 불러오지 못했습니다.')
          setDocumentResults([])
        } else {
          setDocumentResults((data as DocumentRow[]) ?? [])
        }
      } catch {
        if (!cancelled) {
          setError('문서를 불러오지 못했습니다.')
          setDocumentResults([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void search()
    return () => {
      cancelled = true
    }
  }, [scope, selectedSiteId, query, options.minQueryLength, supabase])

  /* ─── Client-side site filter ─── */

  const filteredSites = useMemo<SiteSummary[]>(() => {
    if (scope === 'site_select') {
      return filterSites(accessibleSites, query)
    }
    return accessibleSites
  }, [scope, accessibleSites, query])

  const filteredResults = useMemo<MenuSearchResult[]>(() => {
    if (scope === 'site_select') {
      return sitesToResults(filteredSites, scope)
    }
    if (scope === 'documents') {
      return docsToResults(documentResults, scope)
    }
    return []
  }, [scope, filteredSites, documentResults])

  return {
    query,
    setQuery,
    scope,
    filteredSites,
    filteredResults,
    filteredDocuments: documentResults,
    loading,
    error,
    clear,
  }
}
