import {
  OFFLINE_STORE_NAMES,
  deleteOfflineRecord,
  readOfflineRecord,
  writeOfflineRecord,
} from './storage'
import type { WorklogMediaAttachment } from '../worklog-media'

export type WorklogSectionKey = 'workers' | 'tasks' | 'materials' | 'media'

export interface DraftWorkerItem {
  name: string
  count: number
}

export interface DraftMaterialItem {
  name: string
  quantity: number
}

export interface WorklogDraftRecord {
  key: string
  userId: string
  siteId: string
  workDate: string
  activeSection: WorklogSectionKey
  workerArray: DraftWorkerItem[]
  taskTags: string[]
  materialItems: DraftMaterialItem[]
  /** Media attachment metadata (excluding file/blob/previewUrl for serialization safety) */
  mediaAttachments?: WorklogMediaAttachment[]
  updatedAt: string
}

export function buildWorklogDraftKey(userId: string, siteId: string, workDate: string): string {
  return `${userId}:${siteId}:${workDate}`
}

function isValidDraftScope(input: {
  userId?: string | null
  siteId?: string | null
  workDate?: string | null
}): boolean {
  return Boolean(input.userId && input.siteId && input.workDate)
}

export async function loadWorklogDraft(
  userId: string,
  siteId: string,
  workDate: string
): Promise<WorklogDraftRecord | null> {
  if (!isValidDraftScope({ userId, siteId, workDate })) return null

  try {
    return await readOfflineRecord<WorklogDraftRecord>(
      OFFLINE_STORE_NAMES.worklogDrafts,
      buildWorklogDraftKey(userId, siteId, workDate)
    )
  } catch (error) {
    console.warn('[offline] failed to load worklog draft', error)
    return null
  }
}

export async function saveWorklogDraft(
  draft: Omit<WorklogDraftRecord, 'key' | 'updatedAt'>
): Promise<void> {
  if (!isValidDraftScope(draft)) return

  try {
    await writeOfflineRecord(OFFLINE_STORE_NAMES.worklogDrafts, {
      ...draft,
      key: buildWorklogDraftKey(draft.userId, draft.siteId, draft.workDate),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('[offline] failed to save worklog draft', error)
  }
}

export async function clearWorklogDraft(
  userId: string,
  siteId: string,
  workDate: string
): Promise<void> {
  if (!isValidDraftScope({ userId, siteId, workDate })) return

  try {
    await deleteOfflineRecord(
      OFFLINE_STORE_NAMES.worklogDrafts,
      buildWorklogDraftKey(userId, siteId, workDate)
    )
  } catch (error) {
    console.warn('[offline] failed to clear worklog draft', error)
  }
}
