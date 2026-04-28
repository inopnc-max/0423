/* ═══════════════════════════════════════════════════════════════════
   localStorage UI State Manager
   INOPNC 가이드북 Phase B: 상태 복원

   localStorage 키 규칙:
   - inopnc_*: 앱 네임스페이스 prefix
   - 계층적 구조: user > site > session

   사용처:
   - selectedSiteId / selectedDate (앱 전역)
   - recentSearches (검색 히스토리, 최대 20개)
   - coachmarks (코치마크 표시 여부)
   - dateSwiperPosition (날짜 스와이퍼 위치)
   - lastPreviewMode (미리보기 모드)
   ═══════════════════════════════════════════════════════════════════ */

const STORAGE_PREFIX = 'inopnc_'

/* ─── Storage Keys ─── */

export const UI_STATE_KEYS = {
  selectedSite: `${STORAGE_PREFIX}selected_site`,
  selectedDate: `${STORAGE_PREFIX}selected_date`,
  recentSearches: `${STORAGE_PREFIX}recent_searches`,
  coachmarks: `${STORAGE_PREFIX}coachmarks`,
  dateSwiperPosition: `${STORAGE_PREFIX}date_swiper_position`,
  lastPreviewMode: `${STORAGE_PREFIX}last_preview_mode`,
  worklogSection: `${STORAGE_PREFIX}worklog_section`,
} as const

type UiStateKey = (typeof UI_STATE_KEYS)[keyof typeof UI_STATE_KEYS]

/* ─── Generic Storage Helpers ─── */

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function safeGetItem(key: UiStateKey): string | null {
  if (!isBrowser()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    console.warn(`[ui-state] localStorage read failed for key: ${key}`)
    return null
  }
}

function safeSetItem(key: UiStateKey, value: string): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    console.warn(`[ui-state] localStorage write failed for key: ${key}`)
  }
}

function safeRemoveItem(key: UiStateKey): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    console.warn(`[ui-state] localStorage remove failed for key: ${key}`)
  }
}

function safeGetObject<T>(key: UiStateKey, fallback: T): T {
  const raw = safeGetItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeSetObject<T>(key: UiStateKey, value: T): void {
  try {
    safeSetItem(key, JSON.stringify(value))
  } catch {
    console.warn(`[ui-state] localStorage object write failed for key: ${key}`)
  }
}

/* ─── UI State: selectedSiteId ─── */

export function getSelectedSiteId(): string | null {
  return safeGetItem(UI_STATE_KEYS.selectedSite)
}

export function setSelectedSiteId(siteId: string | null): void {
  if (siteId) {
    safeSetItem(UI_STATE_KEYS.selectedSite, siteId)
  } else {
    safeRemoveItem(UI_STATE_KEYS.selectedSite)
  }
}

/* ─── UI State: selectedDate (alias: selectedWorkDate) ─── */

export function getSelectedDate(): string | null {
  return safeGetItem(UI_STATE_KEYS.selectedDate)
}

export function setSelectedDate(date: string | null): void {
  if (date) {
    safeSetItem(UI_STATE_KEYS.selectedDate, date)
  } else {
    safeRemoveItem(UI_STATE_KEYS.selectedDate)
  }
}

/** Alias for selectedDate — same localStorage key, clearer app-wide naming */
export function getSelectedWorkDate(): string | null {
  return getSelectedDate()
}

/** Alias for selectedDate — same localStorage key, clearer app-wide naming */
export function setSelectedWorkDate(date: string | null): void {
  setSelectedDate(date)
}

/* ─── UI State: Recent Searches ─── */

const MAX_RECENT_SEARCHES = 20

export interface RecentSearch {
  query: string
  timestamp: number
  resultCount?: number
}

export function getRecentSearches(): RecentSearch[] {
  return safeGetObject<RecentSearch[]>(UI_STATE_KEYS.recentSearches, [])
}

export function addRecentSearch(query: string, resultCount?: number): void {
  if (!query.trim()) return

  const searches = getRecentSearches().filter(s => s.query !== query)
  const newSearch: RecentSearch = {
    query: query.trim(),
    timestamp: Date.now(),
    resultCount,
  }

  searches.unshift(newSearch)
  safeSetObject(UI_STATE_KEYS.recentSearches, searches.slice(0, MAX_RECENT_SEARCHES))
}

export function clearRecentSearches(): void {
  safeRemoveItem(UI_STATE_KEYS.recentSearches)
}

/* ─── UI State: Coachmarks ─── */

export type CoachmarkId =
  | 'worklog-first-visit'
  | 'photo-upload-tip'
  | 'site-selector-hint'
  | 'drawing-marking-tip'
  | 'confirm-sheet-tip'

export function getDismissedCoachmarks(): CoachmarkId[] {
  return safeGetObject<CoachmarkId[]>(UI_STATE_KEYS.coachmarks, [])
}

export function dismissCoachmark(id: CoachmarkId): void {
  const dismissed = getDismissedCoachmarks()
  if (!dismissed.includes(id)) {
    safeSetObject(UI_STATE_KEYS.coachmarks, [...dismissed, id])
  }
}

export function isCoachmarkDismissed(id: CoachmarkId): boolean {
  return getDismissedCoachmarks().includes(id)
}

export function resetCoachmarks(): void {
  safeRemoveItem(UI_STATE_KEYS.coachmarks)
}

/* ─── UI State: Date Swiper Position ─── */

export function getDateSwiperPosition(): number {
  return safeGetObject<number>(UI_STATE_KEYS.dateSwiperPosition, 0)
}

export function setDateSwiperPosition(position: number): void {
  safeSetObject(UI_STATE_KEYS.dateSwiperPosition, position)
}

/* ─── UI State: Last Preview Mode ─── */

export type PreviewMode = 'worklog' | 'photo-sheet' | 'issue-report' | 'drawing'

export function getLastPreviewMode(): PreviewMode {
  return safeGetObject<PreviewMode>(UI_STATE_KEYS.lastPreviewMode, 'worklog')
}

export function setLastPreviewMode(mode: PreviewMode): void {
  safeSetObject(UI_STATE_KEYS.lastPreviewMode, mode)
}

/* ─── UI State: Worklog Section ─── */

export type WorklogSection = 'workers' | 'tasks' | 'materials' | 'media'

export function getWorklogSection(): WorklogSection {
  return safeGetObject<WorklogSection>(UI_STATE_KEYS.worklogSection, 'workers')
}

export function setWorklogSection(section: WorklogSection): void {
  safeSetObject(UI_STATE_KEYS.worklogSection, section)
}

/* ─── UI State: Batch Operations ─── */

export interface UiStateSnapshot {
  selectedSiteId: string | null
  selectedDate: string | null
  worklogSection: WorklogSection
  previewMode: PreviewMode
  dateSwiperPosition: number
}

export function getUiStateSnapshot(): UiStateSnapshot {
  return {
    selectedSiteId: getSelectedSiteId(),
    selectedDate: getSelectedDate(),
    worklogSection: getWorklogSection(),
    previewMode: getLastPreviewMode(),
    dateSwiperPosition: getDateSwiperPosition(),
  }
}

export function restoreUiStateSnapshot(snapshot: Partial<UiStateSnapshot>): void {
  if (snapshot.selectedSiteId !== undefined) setSelectedSiteId(snapshot.selectedSiteId)
  if (snapshot.selectedDate !== undefined) setSelectedDate(snapshot.selectedDate)
  if (snapshot.worklogSection !== undefined) setWorklogSection(snapshot.worklogSection)
  if (snapshot.previewMode !== undefined) setLastPreviewMode(snapshot.previewMode)
  if (snapshot.dateSwiperPosition !== undefined) setDateSwiperPosition(snapshot.dateSwiperPosition)
}

export function clearAllUiState(): void {
  Object.values(UI_STATE_KEYS).forEach(key => safeRemoveItem(key))
}
