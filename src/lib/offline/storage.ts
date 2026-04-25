const OFFLINE_DB_NAME = 'inopnc-offline'
const OFFLINE_DB_VERSION = 3

export const OFFLINE_STORE_NAMES = {
  worklogDrafts: 'worklog-drafts',
  syncQueue: 'sync-queue',
  userUiState: 'user-ui-state',
} as const

type OfflineStoreName =
  (typeof OFFLINE_STORE_NAMES)[keyof typeof OFFLINE_STORE_NAMES]

function openOfflineDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(OFFLINE_STORE_NAMES.worklogDrafts)) {
        database.createObjectStore(OFFLINE_STORE_NAMES.worklogDrafts, { keyPath: 'key' })
      }

      if (!database.objectStoreNames.contains(OFFLINE_STORE_NAMES.syncQueue)) {
        database.createObjectStore(OFFLINE_STORE_NAMES.syncQueue, { keyPath: 'key' })
      }

      if (!database.objectStoreNames.contains(OFFLINE_STORE_NAMES.userUiState)) {
        database.createObjectStore(OFFLINE_STORE_NAMES.userUiState, { keyPath: 'key' })
      }

      if (!database.objectStoreNames.contains('blobs')) {
        database.createObjectStore('blobs', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

export async function readOfflineRecord<T>(
  storeName: OfflineStoreName,
  key: string
): Promise<T | null> {
  const database = await openOfflineDatabase()
  if (!database) return null

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)

    request.onsuccess = () => {
      database.close()
      resolve((request.result as T | undefined) ?? null)
    }

    request.onerror = () => {
      database.close()
      reject(request.error ?? new Error(`Failed to read ${storeName}`))
    }
  })
}

export async function readAllOfflineRecords<T>(
  storeName: OfflineStoreName
): Promise<T[]> {
  const database = await openOfflineDatabase()
  if (!database) return []

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => {
      database.close()
      resolve((request.result as T[] | undefined) ?? [])
    }

    request.onerror = () => {
      database.close()
      reject(request.error ?? new Error(`Failed to read all ${storeName}`))
    }
  })
}

export async function writeOfflineRecord<T extends { key: string }>(
  storeName: OfflineStoreName,
  value: T
): Promise<void> {
  const database = await openOfflineDatabase()
  if (!database) return

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(value)

    request.onsuccess = () => {
      database.close()
      resolve()
    }

    request.onerror = () => {
      database.close()
      reject(request.error ?? new Error(`Failed to write ${storeName}`))
    }
  })
}

export async function deleteOfflineRecord(
  storeName: OfflineStoreName,
  key: string
): Promise<void> {
  const database = await openOfflineDatabase()
  if (!database) return

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)

    request.onsuccess = () => {
      database.close()
      resolve()
    }

    request.onerror = () => {
      database.close()
      reject(request.error ?? new Error(`Failed to delete ${storeName}`))
    }
  })
}
