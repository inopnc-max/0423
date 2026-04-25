/**
 * IndexedDB blob storage for large binary files (worklog media attachments).
 * Uses the shared `inopnc-offline` database with a dedicated `blobs` object store.
 *
 * localBlobId format: `{namespace}:{uuid}`
 * e.g. "worklog-media:a1b2c3d4-..."
 *
 * Actual upload to Supabase Storage and Draft persistence are deferred to later PRs.
 */

export type BlobNamespace = 'worklog-media'

interface BlobRecord {
  id: string
  namespace: BlobNamespace
  name: string
  mimeType: string
  size: number
  blob: Blob
  createdAt: string
}

const BLOB_STORE_NAME = 'blobs'

function parseLocalBlobId(localBlobId: string): { namespace: BlobNamespace; uuid: string } | null {
  const colonIdx = localBlobId.indexOf(':')
  if (colonIdx === -1) return null
  const namespace = localBlobId.slice(0, colonIdx) as BlobNamespace
  const uuid = localBlobId.slice(colonIdx + 1)
  if (!namespace || !uuid) return null
  return { namespace, uuid }
}

export async function saveLocalBlob(input: {
  blob: Blob
  namespace: BlobNamespace
  name: string
  mimeType: string
}): Promise<string> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    throw new Error('IndexedDB not available')
  }

  const { blob, namespace, name, mimeType } = input
  const uuid = crypto.randomUUID()
  const localBlobId = `${namespace}:${uuid}`

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('inopnc-offline', 3)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(BLOB_STORE_NAME)) {
        database.createObjectStore(BLOB_STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => {
      const database = request.result
      const record: BlobRecord = {
        id: localBlobId,
        namespace,
        name,
        mimeType,
        size: blob.size,
        blob,
        createdAt: new Date().toISOString(),
      }

      const tx = database.transaction(BLOB_STORE_NAME, 'readwrite')
      const store = tx.objectStore(BLOB_STORE_NAME)
      const putRequest = store.put(record)

      putRequest.onsuccess = () => {
        database.close()
        resolve(localBlobId)
      }

      putRequest.onerror = () => {
        database.close()
        reject(putRequest.error ?? new Error('Failed to save blob'))
      }
    }

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB'))
    }
  })
}

export async function getLocalBlob(localBlobId: string): Promise<Blob | null> {
  const parsed = parseLocalBlobId(localBlobId)
  if (!parsed) return null

  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return null
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('inopnc-offline', 3)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(BLOB_STORE_NAME)) {
        database.createObjectStore(BLOB_STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => {
      const database = request.result
      const tx = database.transaction(BLOB_STORE_NAME, 'readonly')
      const store = tx.objectStore(BLOB_STORE_NAME)
      const getRequest = store.get(localBlobId)

      getRequest.onsuccess = () => {
        database.close()
        const record = getRequest.result as BlobRecord | undefined
        resolve(record?.blob ?? null)
      }

      getRequest.onerror = () => {
        database.close()
        reject(getRequest.error ?? new Error('Failed to get blob'))
      }
    }

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB'))
    }
  })
}

export async function deleteLocalBlob(localBlobId: string): Promise<void> {
  const parsed = parseLocalBlobId(localBlobId)
  if (!parsed) return

  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('inopnc-offline', 3)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(BLOB_STORE_NAME)) {
        database.createObjectStore(BLOB_STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => {
      const database = request.result
      const tx = database.transaction(BLOB_STORE_NAME, 'readwrite')
      const store = tx.objectStore(BLOB_STORE_NAME)
      const deleteRequest = store.delete(localBlobId)

      deleteRequest.onsuccess = () => {
        database.close()
        resolve()
      }

      deleteRequest.onerror = () => {
        database.close()
        reject(deleteRequest.error ?? new Error('Failed to delete blob'))
      }
    }

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB'))
    }
  })
}
