/* ═══════════════════════════════════════════════════════════════════
   Menu Search — Common Types
   PR 5-A: Home/Site 검색 공통 기반
   ═══════════════════════════════════════════════════════════════════ */

/* Re-export SiteSummary for convenience */
export type { SiteSummary } from '@/contexts/selected-site-context'

/* ─── Scope ─── */

export type MenuSearchScope =
  | 'site_select'
  | 'worklog'
  | 'output'
  | 'documents'
  | 'workers'
  | 'production'
  | 'approval'
  | 'global'

/* ─── Result Item ─── */

export type MenuSearchResultType =
  | 'site'
  | 'worklog'
  | 'document'
  | 'photo'
  | 'drawing'
  | 'issue'
  | 'worker'
  | 'production'

export type MenuSearchResult = {
  id: string
  scope: MenuSearchScope
  type: MenuSearchResultType
  title: string
  subtitle?: string
  siteId?: string
  route?: string
  previewPayload?: unknown
}

/* ─── Search Options ─── */

export interface MenuSearchOptions {
  scope: MenuSearchScope
  minQueryLength?: number
}
