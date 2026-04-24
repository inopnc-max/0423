import {
  OFFLINE_STORE_NAMES,
  deleteOfflineRecord,
  readOfflineRecord,
  writeOfflineRecord,
} from './storage'

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
  updatedAt: string
}

function buildDraftKey(userId: string, siteId: string, workDate: string) {
  return `${userId}:${siteId}:${workDate}`
}

export async function loadWorklogDraft(
  userId: string,
  siteId: string,
  workDate: string
): Promise<WorklogDraftRecord | null> {
  try {
    return await readOfflineRecord<WorklogDraftRecord>(
      OFFLINE_STORE_NAMES.worklogDrafts,
      buildDraftKey(userId, siteId, workDate)
    )
  } catch (error) {
    console.warn('[offline] failed to load worklog draft', error)
    return null
  }
}

export async function saveWorklogDraft(
  draft: Omit<WorklogDraftRecord, 'key' | 'updatedAt'>
): Promise<void> {
  try {
    await writeOfflineRecord(OFFLINE_STORE_NAMES.worklogDrafts, {
      ...draft,
      key: buildDraftKey(draft.userId, draft.siteId, draft.workDate),
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
  try {
    await deleteOfflineRecord(
      OFFLINE_STORE_NAMES.worklogDrafts,
      buildDraftKey(userId, siteId, workDate)
    )
  } catch (error) {
    console.warn('[offline] failed to clear worklog draft', error)
  }
}
