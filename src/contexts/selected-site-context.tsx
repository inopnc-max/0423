'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { loadUserUiState } from '@/lib/user-ui-state'
import { setSelectedSiteId as setLocalSelectedSiteId } from '@/lib/ui-state'
import type { UserUiStateRecord } from '@/lib/user-ui-state'

/* ─── Types ─── */

export interface SiteSummary {
  id: string
  name: string
  company: string
  affiliation: string
  status: string
  address?: string
}

interface SelectedSiteContextValue {
  selectedSiteId: string | null
  selectedSite: SiteSummary | null
  accessibleSites: SiteSummary[]
  loading: boolean
  error: string | null
  setSelectedSiteId: (siteId: string | null) => Promise<void>
  refreshSelectedSite: () => Promise<void>
  refreshAccessibleSites: () => Promise<void>
}

const SelectedSiteContext = createContext<SelectedSiteContextValue | null>(null)

/* ─── Helpers ─── */

async function loadAccessibleSites(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  userRole: string
): Promise<SiteSummary[]> {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('id, name, company, affiliation, status, address')
      .order('name')
      .limit(100)

    if (error) {
      console.warn('[selected-site] failed to load accessible sites:', error)
      return []
    }

    const sites = (data ?? []) as SiteSummary[]

    if (userRole === 'admin' || userRole === 'site_manager') {
      return sites
    }

    if (userRole === 'worker') {
      const { data: profileData } = await supabase
        .from('workers')
        .select('site_ids')
        .eq('id', userId)
        .maybeSingle()

      const allowedIds = (profileData?.site_ids as string[] | null) ?? []
      return sites.filter(site => allowedIds.includes(site.id))
    }

    return sites
  } catch (err) {
    console.warn('[selected-site] failed to load accessible sites:', err)
    return []
  }
}

async function loadRecentSiteId(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('daily_logs')
      .select('site_id')
      .eq('user_id', userId)
      .order('work_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    return (data as { site_id: string } | null)?.site_id ?? null
  } catch {
    return null
  }
}

async function loadFavoriteSiteId(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('site_favorites')
      .select('site_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return (data as { site_id: string } | null)?.site_id ?? null
  } catch {
    return null
  }
}

async function loadWorkerDefaultSiteId(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('workers')
      .select('site_ids')
      .eq('id', userId)
      .maybeSingle()

    const siteIds = (data?.site_ids as string[] | null) ?? []
    return siteIds[0] ?? null
  } catch {
    return null
  }
}

function buildUiStatePayload(
  current: UserUiStateRecord | null,
  userId: string,
  siteId: string | null
): UserUiStateRecord {
  return {
    user_id: current?.user_id ?? userId,
    selected_site_id: siteId,
    last_site_id: siteId,
    last_work_date: current?.last_work_date ?? null,
    last_section: current?.last_section ?? null,
    recent_worker_template: current?.recent_worker_template ?? [],
    recent_tag_template: current?.recent_tag_template ?? [],
  }
}

function isAccessibleSite(siteId: string, accessibleSites: SiteSummary[]): boolean {
  return accessibleSites.some(site => site.id === siteId)
}

/* ─── Provider ─── */

export function SelectedSiteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [uiState, setUiState] = useState<UserUiStateRecord | null>(null)
  const [accessibleSites, setAccessibleSites] = useState<SiteSummary[]>([])
  const [selectedSiteId, setSelectedSiteIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedSite = useMemo(
    () => accessibleSites.find(site => site.id === selectedSiteId) ?? null,
    [accessibleSites, selectedSiteId]
  )

  /* ─── Initial load ─── */
  const loadInitial = useCallback(async () => {
    if (!user) {
      setUiState(null)
      setAccessibleSites([])
      setSelectedSiteIdState(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [
        uiStateResult,
        sitesResult,
        recentSiteId,
        favoriteSiteId,
        workerDefaultSiteId,
      ] = await Promise.all([
        loadUserUiState(supabase, user.userId),
        loadAccessibleSites(supabase, user.userId, user.role),
        loadRecentSiteId(supabase, user.userId),
        loadFavoriteSiteId(supabase, user.userId),
        loadWorkerDefaultSiteId(supabase, user.userId),
      ])

      setUiState(uiStateResult)
      setAccessibleSites(sitesResult)

      const urlParams = new URLSearchParams(window.location.search)
      const urlSiteId = urlParams.get('site')

      let resolved: string | null = null

      if (urlSiteId && isAccessibleSite(urlSiteId, sitesResult)) {
        resolved = urlSiteId
      } else if (uiStateResult?.selected_site_id && isAccessibleSite(uiStateResult.selected_site_id, sitesResult)) {
        resolved = uiStateResult.selected_site_id
      } else if (uiStateResult?.last_site_id && isAccessibleSite(uiStateResult.last_site_id, sitesResult)) {
        resolved = uiStateResult.last_site_id
      } else if (recentSiteId && isAccessibleSite(recentSiteId, sitesResult)) {
        resolved = recentSiteId
      } else if (favoriteSiteId && isAccessibleSite(favoriteSiteId, sitesResult)) {
        resolved = favoriteSiteId
      } else if (workerDefaultSiteId && isAccessibleSite(workerDefaultSiteId, sitesResult)) {
        resolved = workerDefaultSiteId
      } else if (sitesResult.length > 0) {
        resolved = sitesResult[0].id
      }

      setSelectedSiteIdState(resolved)
      setLocalSelectedSiteId(resolved)
    } catch (err) {
      console.error('[selected-site] initial load failed:', err)
      setError('현장 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    void loadInitial()
  }, [loadInitial])

  /* ─── setSelectedSiteId ─── */
  const setSelectedSiteId = useCallback(
    async (siteId: string | null) => {
      if (!user) return

      setSelectedSiteIdState(siteId)
      setLocalSelectedSiteId(siteId)

      const next = buildUiStatePayload(uiState, user.userId, siteId)
      setUiState(next)

      try {
        const { error: upsertError } = await supabase
          .from('user_ui_state')
          .upsert(next)

        if (upsertError) {
          console.warn('[selected-site] failed to persist selected_site_id:', upsertError)
        }
      } catch (err) {
        console.warn('[selected-site] failed to persist selected_site_id:', err)
      }
    },
    [supabase, uiState, user]
  )

  /* ─── refresh ─── */
  const refreshSelectedSite = useCallback(async () => {
    await loadInitial()
  }, [loadInitial])

  const refreshAccessibleSites = useCallback(async () => {
    if (!user) return
    const sites = await loadAccessibleSites(supabase, user.userId, user.role)
    setAccessibleSites(sites)

    if (selectedSiteId && !isAccessibleSite(selectedSiteId, sites)) {
      const nextSiteId = sites[0]?.id ?? null
      setSelectedSiteIdState(nextSiteId)
      setLocalSelectedSiteId(nextSiteId)
    }
  }, [supabase, user, selectedSiteId])

  const value = useMemo<SelectedSiteContextValue>(
    () => ({
      selectedSiteId,
      selectedSite,
      accessibleSites,
      loading,
      error,
      setSelectedSiteId,
      refreshSelectedSite,
      refreshAccessibleSites,
    }),
    [selectedSiteId, selectedSite, accessibleSites, loading, error, setSelectedSiteId, refreshSelectedSite, refreshAccessibleSites]
  )

  return (
    <SelectedSiteContext.Provider value={value}>
      {children}
    </SelectedSiteContext.Provider>
  )
}

/* ─── Hook ─── */

export function useSelectedSite(): SelectedSiteContextValue {
  const ctx = useContext(SelectedSiteContext)
  if (!ctx) {
    throw new Error('useSelectedSite must be used within SelectedSiteProvider')
  }
  return ctx
}
