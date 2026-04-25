import type { SupabaseClient } from '@supabase/supabase-js'
import {
  OFFLINE_STORE_NAMES,
  readOfflineRecord,
  writeOfflineRecord,
} from './offline/storage'
import type { WorklogSectionKey } from './offline/worklog-draft'

export interface UserUiStateRecord {
  user_id: string
  selected_site_id: string | null
  last_site_id: string | null
  last_work_date: string | null
  last_section: WorklogSectionKey | null
  recent_worker_template: string[]
  recent_tag_template: string[]
  updated_at?: string
}

interface CachedUserUiStateRecord extends UserUiStateRecord {
  key: string
}

function buildCacheKey(userId: string) {
  return `user:${userId}`
}

function normalizeUserUiState(
  userId: string,
  data?: Partial<UserUiStateRecord> | null
): UserUiStateRecord {
  return {
    user_id: userId,
    selected_site_id: data?.selected_site_id ?? null,
    last_site_id: data?.last_site_id ?? null,
    last_work_date: data?.last_work_date ?? null,
    last_section: data?.last_section ?? null,
    recent_worker_template: Array.isArray(data?.recent_worker_template)
      ? data.recent_worker_template.filter(
          (item): item is string => typeof item === 'string'
        )
      : [],
    recent_tag_template: Array.isArray(data?.recent_tag_template)
      ? data.recent_tag_template.filter((item): item is string => typeof item === 'string')
      : [],
    updated_at: data?.updated_at,
  }
}

async function loadCachedUserUiState(
  userId: string
): Promise<UserUiStateRecord | null> {
  let cached: CachedUserUiStateRecord | null = null

  try {
    cached = await readOfflineRecord<CachedUserUiStateRecord>(
      OFFLINE_STORE_NAMES.userUiState,
      buildCacheKey(userId)
    )
  } catch (error) {
    console.warn('[ui-state] failed to read cached UI state', error)
  }

  if (!cached) return null
  return normalizeUserUiState(userId, cached)
}

async function cacheUserUiState(record: UserUiStateRecord): Promise<void> {
  try {
    await writeOfflineRecord(OFFLINE_STORE_NAMES.userUiState, {
      ...record,
      key: buildCacheKey(record.user_id),
    })
  } catch (error) {
    console.warn('[ui-state] failed to cache UI state', error)
  }
}

export async function loadUserUiState(
  supabase: SupabaseClient,
  userId: string
): Promise<UserUiStateRecord | null> {
  const cached = await loadCachedUserUiState(userId)

  try {
    const { data, error } = await supabase
      .from('user_ui_state')
      .select(
        'user_id, selected_site_id, last_site_id, last_work_date, last_section, recent_worker_template, recent_tag_template, updated_at'
      )
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) {
      return cached
    }

    const normalized = normalizeUserUiState(userId, data)
    await cacheUserUiState(normalized)
    return normalized
  } catch (error) {
    console.warn('[ui-state] falling back to cached UI state', error)
    return cached
  }
}

export async function saveUserUiState(
  supabase: SupabaseClient,
  record: UserUiStateRecord
): Promise<void> {
  const normalized = normalizeUserUiState(record.user_id, record)
  await cacheUserUiState(normalized)

  try {
    const { error } = await supabase.from('user_ui_state').upsert(normalized)
    if (error) {
      console.warn('[ui-state] failed to persist to Supabase', error)
    }
  } catch (error) {
    console.warn('[ui-state] failed to persist to Supabase', error)
  }
}
