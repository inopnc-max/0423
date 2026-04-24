'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import {
  OFFLINE_STORE_NAMES,
  deleteOfflineRecord,
  readAllOfflineRecords,
  readOfflineRecord,
  writeOfflineRecord,
} from '@/lib/offline/storage'
import type { DraftMaterialItem, DraftWorkerItem } from '@/lib/offline/worklog-draft'

/* ─── Types ─── */

type SyncQueueEntity = 'daily_logs'
type SyncQueueAction = 'insert' | 'update'
type DailyLogStatus = 'draft' | 'pending'

export interface DailyLogSyncPayload {
  id?: string
  site_id: string
  work_date: string
  user_id: string
  worker_array: DraftWorkerItem[]
  task_tags: string[]
  material_items: DraftMaterialItem[]
  status: DailyLogStatus
  site_info: Record<string, unknown>
}

interface SyncQueueItem {
  key: string
  id: string
  userId: string
  entity: SyncQueueEntity
  action: SyncQueueAction
  payload: DailyLogSyncPayload
  createdAt: string
  retryCount: number
  lastError?: string
}

interface SyncContextValue {
  isOnline: boolean
  syncing: boolean
  queueCount: number
  lastSyncedAt: string | null
  enqueueDailyLogSave: (payload: DailyLogSyncPayload) => Promise<void>
  getQueuedDailyLogSave: (siteId: string, workDate: string) => Promise<DailyLogSyncPayload | null>
  clearQueuedDailyLogSave: (siteId: string, workDate: string) => Promise<void>
  flushQueue: () => Promise<void>
}

/* ─── Queue Key Helpers ─── */

const buildDailyLogQueueKey = (userId: string, siteId: string, workDate: string) =>
  `daily_logs:${userId}:${siteId}:${workDate}`

/* ─── Error Handling ─── */

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Unknown sync error'
}

const isRetryableSyncError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase()
  return ['fetch', 'network', 'offline', 'failed to fetch'].some(k => message.includes(k))
}

/* ─── Context ─── */

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const syncInProgressRef = useRef(false)

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  const [syncing, setSyncing] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const listUserQueueItems = useCallback(async () => {
    if (!user) return []

    try {
      const items = await readAllOfflineRecords<SyncQueueItem>(OFFLINE_STORE_NAMES.syncQueue)
      return items
        .filter(item => item.userId === user.userId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    } catch (error) {
      console.warn('[sync] failed to list queued items', error)
      return []
    }
  }, [user])

  const refreshQueueCount = useCallback(async () => {
    if (!user) {
      setQueueCount(0)
      return
    }

    const items = await listUserQueueItems()
    setQueueCount(items.length)
  }, [listUserQueueItems, user])

  const clearQueuedDailyLogSave = useCallback(
    async (siteId: string, workDate: string) => {
      if (!user) return

      try {
        await deleteOfflineRecord(
          OFFLINE_STORE_NAMES.syncQueue,
          buildDailyLogQueueKey(user.userId, siteId, workDate)
        )
      } catch (error) {
        console.warn('[sync] failed to clear queued daily log', error)
      }

      await refreshQueueCount()
    },
    [refreshQueueCount, user]
  )

  const getQueuedDailyLogSave = useCallback(
    async (siteId: string, workDate: string) => {
      if (!user) return null

      try {
        const item = await readOfflineRecord<SyncQueueItem>(
          OFFLINE_STORE_NAMES.syncQueue,
          buildDailyLogQueueKey(user.userId, siteId, workDate)
        )

        return item?.payload ?? null
      } catch (error) {
        console.warn('[sync] failed to read queued daily log', error)
        return null
      }
    },
    [user]
  )

  const enqueueDailyLogSave = useCallback(
    async (payload: DailyLogSyncPayload) => {
      if (!user) return

      const key = buildDailyLogQueueKey(user.userId, payload.site_id, payload.work_date)
      let existingItem: SyncQueueItem | null = null

      try {
        existingItem = await readOfflineRecord<SyncQueueItem>(
          OFFLINE_STORE_NAMES.syncQueue,
          key
        )
      } catch (error) {
        console.warn('[sync] failed to read existing queue item', error)
      }

      try {
        await writeOfflineRecord<SyncQueueItem>(OFFLINE_STORE_NAMES.syncQueue, {
          key,
          id: existingItem?.id ?? key,
          userId: user.userId,
          entity: 'daily_logs',
          action: payload.id || existingItem ? 'update' : 'insert',
          payload,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          lastError: undefined,
        })
      } catch (error) {
        console.warn('[sync] failed to queue daily log save', error)
      }

      await refreshQueueCount()
    },
    [refreshQueueCount, user]
  )

  const flushQueue = useCallback(async () => {
    if (!user || syncInProgressRef.current) return

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false)
      return
    }

    const queueItems = await listUserQueueItems()
    setQueueCount(queueItems.length)

    if (queueItems.length === 0) return

    syncInProgressRef.current = true
    setSyncing(true)

    let syncedCount = 0

    try {
      for (const item of queueItems) {
        try {
          if (item.entity === 'daily_logs') {
            const { id: _ignoredId, ...payload } = item.payload

            const { error } = await supabase.from('daily_logs').upsert(payload, {
              onConflict: 'site_id,work_date',
            })

            if (error) {
              throw error
            }
          }

          await deleteOfflineRecord(OFFLINE_STORE_NAMES.syncQueue, item.key)
          syncedCount += 1
        } catch (error) {
          const updatedItem: SyncQueueItem = {
            ...item,
            retryCount: item.retryCount + 1,
            lastError: getErrorMessage(error),
          }

          await writeOfflineRecord(OFFLINE_STORE_NAMES.syncQueue, updatedItem)

          if (isRetryableSyncError(error)) {
            break
          }
        }
      }
    } finally {
      syncInProgressRef.current = false
      setSyncing(false)
      await refreshQueueCount()
    }

    if (syncedCount > 0) {
      setLastSyncedAt(new Date().toISOString())
    }
  }, [listUserQueueItems, refreshQueueCount, supabase, user])

  useEffect(() => {
    if (!user) {
      setQueueCount(0)
      return
    }

    void refreshQueueCount()

    if (typeof navigator === 'undefined' || navigator.onLine) {
      void flushQueue()
    }
  }, [flushQueue, refreshQueueCount, user])

  useEffect(() => {
    if (typeof window === 'undefined') return

    function handleOnline() {
      setIsOnline(true)
      void flushQueue()
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [flushQueue])

  const value = useMemo<SyncContextValue>(
    () => ({
      isOnline,
      syncing,
      queueCount,
      lastSyncedAt,
      enqueueDailyLogSave,
      getQueuedDailyLogSave,
      clearQueuedDailyLogSave,
      flushQueue,
    }),
    [
      clearQueuedDailyLogSave,
      enqueueDailyLogSave,
      flushQueue,
      getQueuedDailyLogSave,
      isOnline,
      lastSyncedAt,
      queueCount,
      syncing,
    ]
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync() {
  const context = useContext(SyncContext)

  if (!context) {
    throw new Error('useSync must be used within SyncProvider')
  }

  return context
}
