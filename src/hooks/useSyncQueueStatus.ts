'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSyncQueueStatusSummary, type SyncQueueStatusSummary } from '@/lib/offline/sync-queue'

const EMPTY_SUMMARY: SyncQueueStatusSummary = {
  pendingCount: 0,
  failedCount: 0,
  syncingCount: 0,
  doneCount: 0,
  totalOpenCount: 0,
}

export function useSyncQueueStatus(options?: { intervalMs?: number }) {
  const [summary, setSummary] = useState<SyncQueueStatusSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const next = await getSyncQueueStatusSummary()
    setSummary(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      const next = await getSyncQueueStatusSummary()
      if (!cancelled) {
        setSummary(next)
        setLoading(false)
      }
    }

    run()

    const intervalMs = options?.intervalMs ?? 30000
    const timer = window.setInterval(run, intervalMs)

    const handleFocus = () => {
      void run()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void run()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [options?.intervalMs])

  return {
    summary,
    loading,
    refresh,
    hasOpenItems: summary.totalOpenCount > 0,
    hasFailedItems: summary.failedCount > 0,
  }
}
