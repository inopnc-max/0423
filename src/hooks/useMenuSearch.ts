'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelectedSite } from '@/contexts/selected-site-context'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { isPartner } from '@/lib/roles'
import { isPartnerVisibleDocument } from '@/lib/documents/partnerDocuments'
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

export interface DocumentRow {
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

/* ─── Worklog row from Supabase ─── */

export interface WorklogRow {
  id: string
  site_id: string
  work_date: string
  status: string
  worker_array: { name: string; count: number }[]
  task_tags: string[]
  material_items: { name: string; quantity: number }[]
  site_info: Record<string, string>
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
}

/* ─── Output row from Supabase ─── */

export interface OutputRow {
  id: string
  site_id: string
  work_date: string
  status: string
  worker_array: { name: string; count: number }[]
  task_tags: string[]
  site_info: { name?: string; [key: string]: string | undefined }
}

/* ─── Client-side filter helpers ─── */

function safeStringify(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  try {
    return JSON.stringify(val)
  } catch {
    return String(val)
  }
}

function matchWorklogRow(row: WorklogRow, q: string): boolean {
  const lower = q.toLowerCase()
  return (
    row.work_date.includes(q) ||
    row.status.toLowerCase().includes(lower) ||
    row.task_tags.some(t => t.toLowerCase().includes(lower)) ||
    row.worker_array.some(w => w.name.toLowerCase().includes(lower)) ||
    row.material_items.some(m => m.name.toLowerCase().includes(lower)) ||
    safeStringify(row.site_info).toLowerCase().includes(lower)
  )
}

function matchOutputRow(row: OutputRow, q: string): boolean {
  const lower = q.toLowerCase()
  return (
    row.work_date.includes(q) ||
    row.status.toLowerCase().includes(lower) ||
    (row.site_info?.name ?? '').toLowerCase().includes(lower) ||
    row.task_tags.some(t => t.toLowerCase().includes(lower))
  )
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
  /** WorklogRow[] for worklog page (worklog scope) */
  filteredWorklogs: WorklogRow[]
  /** OutputRow[] for output page (output scope) */
  filteredOutputLogs: OutputRow[]
  loading: boolean
  error: string | null
  clear: () => void
}

/* ─── Hook ─── */

export function useMenuSearch(options: MenuSearchOptions): UseMenuSearchReturn {
  const { scope, selectedSiteId: overrideSiteId } = options

  const { accessibleSites, selectedSiteId: contextSelectedSiteId } = useSelectedSite()
  const { user } = useAuth()
  const selectedSiteId = overrideSiteId ?? contextSelectedSiteId
  const [query, setQueryState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentResults, setDocumentResults] = useState<DocumentRow[]>([])
  const [worklogResults, setWorklogResults] = useState<WorklogRow[]>([])
  const [outputResults, setOutputResults] = useState<OutputRow[]>([])

  const supabase = useMemo(() => createClient(), [])
  const queryRef = useRef(query)
  queryRef.current = query

  const setQuery = useCallback((q: string) => {
    setQueryState(q)
  }, [])

  const clear = useCallback(() => {
    setQueryState('')
    setDocumentResults([])
    setWorklogResults([])
    setOutputResults([])
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
      setDocumentResults([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    async function search() {
      try {
        let dbQuery = supabase
          .from('documents')
          .select('id, site_id, category, title, file_url, file_type, created_at, storage_bucket, storage_path, source_type, source_id, approval_status, locked_at')
          .eq('site_id', selectedSiteId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (q.length > 0) {
          dbQuery = dbQuery.or(
            `title.ilike.%${q}%,category.ilike.%${q}%,file_type.ilike.%${q}%`
          )
        }

        if (isPartner(user?.role || '')) {
          dbQuery = dbQuery.eq('approval_status', 'approved').neq('category', '안전서류')
        }

        const { data, error: dbError } = await dbQuery
        let mergedData = data

        if (!dbError && isPartner(user?.role || '')) {
          let lockedQuery = supabase
            .from('documents')
            .select('id, site_id, category, title, file_url, file_type, created_at, storage_bucket, storage_path, source_type, source_id, approval_status, locked_at')
            .eq('site_id', selectedSiteId)
            .not('locked_at', 'is', null)
            .order('created_at', { ascending: false })
            .limit(50)

          if (q.length > 0) {
            lockedQuery = lockedQuery.or(
              `title.ilike.%${q}%,category.ilike.%${q}%,file_type.ilike.%${q}%`
            )
          }

          const locked = await lockedQuery
          if (!locked.error && locked.data?.length) {
            const byId = new Map<string, DocumentRow>()
            for (const row of ((data as DocumentRow[] | null) ?? [])) byId.set(row.id, row)
            for (const row of (locked.data as DocumentRow[])) byId.set(row.id, row)
            mergedData = Array.from(byId.values())
          }
        }

        if (cancelled) return

        if (dbError) {
          setError('문서를 불러오지 못했습니다.')
          setDocumentResults([])
        } else {
          const rows = (mergedData as DocumentRow[]) ?? []
          setDocumentResults(isPartner(user?.role || '') ? rows.filter(isPartnerVisibleDocument) : rows)
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
  }, [scope, selectedSiteId, query, options.minQueryLength, supabase, user?.role])

  /* ─── Worklog search — async Supabase query ─── */

  useEffect(() => {
    if (scope !== 'worklog') return
    if (!selectedSiteId) {
      setWorklogResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    async function search() {
      try {
        const { data, error: dbError } = await supabase
          .from('daily_logs')
          .select(
            'id, site_id, work_date, status, worker_array, task_tags, material_items, site_info, approved_at, rejected_at, rejection_reason'
          )
          .eq('site_id', selectedSiteId)
          .order('work_date', { ascending: false })
          .limit(50)

        if (cancelled) return

        if (dbError) {
          setError('작업일지를 불러오지 못했습니다.')
          setWorklogResults([])
        } else {
          const rows = (data as WorklogRow[]) ?? []
          const q = query.trim()
          const filtered = q.length >= (options.minQueryLength ?? 2)
            ? rows.filter(row => matchWorklogRow(row, q))
            : rows
          setWorklogResults(filtered)
        }
      } catch {
        if (!cancelled) {
          setError('작업일지를 불러오지 못했습니다.')
          setWorklogResults([])
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

  /* ─── Output search — async Supabase query ─── */

  useEffect(() => {
    if (scope !== 'output') return

    let cancelled = false
    setLoading(true)
    setError(null)

    async function search() {
      try {
        let dbQuery = supabase
          .from('daily_logs')
          .select('id, site_id, work_date, status, worker_array, task_tags, site_info')
          .order('work_date', { ascending: false })
          .limit(50)

        if (selectedSiteId) {
          dbQuery = dbQuery.eq('site_id', selectedSiteId)
        }

        const { data, error: dbError } = await dbQuery

        if (cancelled) return

        if (dbError) {
          setError('출역 데이터를 불러오지 못했습니다.')
          setOutputResults([])
        } else {
          const rows = (data as OutputRow[]) ?? []
          const q = query.trim()
          const filtered = q.length >= (options.minQueryLength ?? 2)
            ? rows.filter(row => matchOutputRow(row, q))
            : rows
          setOutputResults(filtered)
        }
      } catch {
        if (!cancelled) {
          setError('출역 데이터를 불러오지 못했습니다.')
          setOutputResults([])
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
    filteredWorklogs: worklogResults,
    filteredOutputLogs: outputResults,
    loading,
    error,
    clear,
  }
}
