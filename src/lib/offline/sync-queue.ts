/**
 * Minimal sync-queue types and helpers for offline-to-online synchronization.
 *
 * This module provides the foundation only:
 * - Type definitions for sync queue items
 * - enqueue / read / update / delete helpers
 *
 * The actual online-sync processor (network-return → drain queue → Supabase calls)
 * is NOT implemented here. It will be added in a future PR.
 */

import {
  OFFLINE_STORE_NAMES,
  readAllOfflineRecords,
  writeOfflineRecord,
  deleteOfflineRecord,
} from './storage'

export type SyncQueueEntity =
  | 'daily_logs'
  | 'photos'
  | 'drawings'
  | 'documents'
  | 'reports'
  | 'production_stock_movements'
  | 'production_expenses'
  | 'user_ui_state'

export type SyncQueueAction =
  | 'insert'
  | 'update'
  | 'delete'
  | 'upload'

export type SyncQueueStatus =
  | 'pending'
  | 'syncing'
  | 'done'
  | 'failed'

export type SyncQueueItem = {
  key: string
  id: string
  entity: SyncQueueEntity
  action: SyncQueueAction
  siteId?: string
  localId?: string
  remoteId?: string
  payload: Record<string, unknown>
  blobKey?: string
  status: SyncQueueStatus
  retryCount: number
  lastError?: string
  createdAt: string
  updatedAt: string
}

export type EnqueueSyncQueueInput = {
  entity: SyncQueueEntity
  action: SyncQueueAction
  siteId?: string
  localId?: string
  remoteId?: string
  payload?: Record<string, unknown>
  blobKey?: string
}

function createLocalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function buildSyncQueueKey(input: {
  entity: SyncQueueEntity
  action: SyncQueueAction
  siteId?: string
  localId?: string
  remoteId?: string
  createdAt?: string
}): string {
  const createdAt = input.createdAt ?? new Date().toISOString()
  const scope = input.siteId ?? 'global'
  const subject = input.localId ?? input.remoteId ?? createLocalId()
  return `${input.entity}:${input.action}:${scope}:${subject}:${createdAt}`
}

export async function enqueueSyncQueueItem(
  input: EnqueueSyncQueueInput
): Promise<SyncQueueItem | null> {
  try {
    const now = new Date().toISOString()
    const localId = input.localId ?? createLocalId()

    const item: SyncQueueItem = {
      key: buildSyncQueueKey({
        entity: input.entity,
        action: input.action,
        siteId: input.siteId,
        localId,
        remoteId: input.remoteId,
        createdAt: now,
      }),
      id: localId,
      entity: input.entity,
      action: input.action,
      siteId: input.siteId,
      localId,
      remoteId: input.remoteId,
      payload: input.payload ?? {},
      blobKey: input.blobKey,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    await writeOfflineRecord(OFFLINE_STORE_NAMES.syncQueue, item)
    return item
  } catch (error) {
    console.warn('[sync-queue] failed to enqueue item', error)
    return null
  }
}

export async function readPendingSyncQueueItems(): Promise<SyncQueueItem[]> {
  try {
    const items = await readAllOfflineRecords<SyncQueueItem>(OFFLINE_STORE_NAMES.syncQueue)
    return items
      .filter(item => item.status === 'pending' || item.status === 'failed')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  } catch (error) {
    console.warn('[sync-queue] failed to read pending items', error)
    return []
  }
}

export async function updateSyncQueueItemStatus(
  item: SyncQueueItem,
  status: SyncQueueStatus,
  options?: { lastError?: string; remoteId?: string }
): Promise<SyncQueueItem | null> {
  try {
    const next: SyncQueueItem = {
      ...item,
      status,
      remoteId: options?.remoteId ?? item.remoteId,
      lastError: options?.lastError,
      retryCount: status === 'failed' ? item.retryCount + 1 : item.retryCount,
      updatedAt: new Date().toISOString(),
    }

    await writeOfflineRecord(OFFLINE_STORE_NAMES.syncQueue, next)
    return next
  } catch (error) {
    console.warn('[sync-queue] failed to update item status', error)
    return null
  }
}

export async function deleteSyncQueueItem(key: string): Promise<void> {
  if (!key) return
  try {
    await deleteOfflineRecord(OFFLINE_STORE_NAMES.syncQueue, key)
  } catch (error) {
    console.warn('[sync-queue] failed to delete item', error)
  }
}
