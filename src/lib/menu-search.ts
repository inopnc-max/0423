/* ═══════════════════════════════════════════════════════════════════
   Menu Search — Common Types
   PR 5-A: Home/Site 검색 공통 기반
   PR 5-B: Documents scope + previewPayload 구조 확장
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

/* ─── Preview Payload ─── */

/** PreviewCenter 연결 준비용 payload — 실제 통합은 다음 PR에서 */
export type MenuSearchPreviewPayload =
  | {
      kind: 'document'
      title: string
      url?: string
      storagePath?: string
      mimeType?: string
      siteId?: string
      sourceId?: string
    }
  | {
      kind: 'photo'
      title: string
      url?: string
      storagePath?: string
      siteId?: string
      sourceId?: string
    }
  | {
      kind: 'drawing'
      title: string
      url?: string
      storagePath?: string
      siteId?: string
      sourceId?: string
    }
  | {
      kind: 'report'
      title: string
      url?: string
      storagePath?: string
      siteId?: string
      sourceId?: string
    }

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
  /** PreviewCenter 연결 준비 — 실제 연결은 다음 PR에서 */
  previewPayload?: MenuSearchPreviewPayload
}

/* ─── Search Options ─── */

export interface MenuSearchOptions {
  scope: MenuSearchScope
  minQueryLength?: number
  /** Override the selectedSiteId from useSelectedSite context.
   *  Useful when a parent component manages its own site selection. */
  selectedSiteId?: string | null
}
