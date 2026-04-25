'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSelectedSite } from '@/contexts/selected-site-context'
import type { MenuSearchResult, MenuSearchOptions, MenuSearchScope, SiteSummary } from '@/lib/menu-search'

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

/* ─── Hook Return ─── */

export interface UseMenuSearchReturn {
  query: string
  setQuery: (q: string) => void
  scope: MenuSearchScope
  /** SiteSummary[] for combobox rendering (site_select scope) */
  filteredSites: SiteSummary[]
  /** MenuSearchResult[] for search result display */
  filteredResults: MenuSearchResult[]
  loading: boolean
  error: string | null
  clear: () => void
}

/* ─── Hook ─── */

export function useMenuSearch(options: MenuSearchOptions): UseMenuSearchReturn {
  const { scope } = options

  const { accessibleSites } = useSelectedSite()
  const [query, setQueryState] = useState('')
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  const setQuery = useCallback((q: string) => {
    setQueryState(q)
  }, [])

  const clear = useCallback(() => {
    setQueryState('')
  }, [])

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
    return []
  }, [scope, filteredSites])

  return {
    query,
    setQuery,
    scope,
    filteredSites,
    filteredResults,
    loading,
    error,
    clear,
  }
}
