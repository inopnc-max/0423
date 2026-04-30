'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  approveSiteManagerLog,
  loadSiteManagerLogs,
  loadSiteManagerWorkers,
  rejectSiteManagerLog,
  saveSiteManagerAttendance,
  summarizeSiteManagerLogs,
  type SiteManagerLog,
  type SiteManagerWorker,
} from '@/lib/site-manager/siteManagerRecords'

type Message = { type: 'success' | 'error'; text: string } | null

export function useSiteManagerDashboard(params: {
  managerId?: string | null
  managerName?: string | null
  siteId?: string | null
  siteName?: string | null
  workDate: string
}) {
  const [logs, setLogs] = useState<SiteManagerLog[]>([])
  const [workers, setWorkers] = useState<SiteManagerWorker[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<Message>(null)

  const refresh = useCallback(async () => {
    if (!params.managerId) {
      setLogs([])
      setWorkers([])
      setLoading(false)
      return
    }

    setLoading(true)
    const [nextLogs, nextWorkers] = await Promise.all([
      loadSiteManagerLogs({ siteId: params.siteId, limit: 120 }),
      loadSiteManagerWorkers({ siteId: params.siteId, today: params.workDate }),
    ])
    setLogs(nextLogs)
    setWorkers(nextWorkers)
    setLoading(false)
  }, [params.managerId, params.siteId, params.workDate])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const summary = useMemo(
    () => summarizeSiteManagerLogs(logs, params.workDate),
    [logs, params.workDate]
  )

  const saveAttendance = useCallback(
    async (input: { manDay: number; memo?: string }) => {
      if (!params.managerId || !params.siteId) {
        setMessage({ type: 'error', text: '현장과 사용자 정보를 확인해주세요.' })
        return
      }

      setSubmitting(true)
      const result = await saveSiteManagerAttendance({
        managerId: params.managerId,
        managerName: params.managerName || '현장관리자',
        siteId: params.siteId,
        siteName: params.siteName,
        workDate: params.workDate,
        manDay: input.manDay,
        memo: input.memo,
      })
      setMessage({ type: result.ok ? 'success' : 'error', text: result.message })
      setSubmitting(false)
      if (result.ok) await refresh()
    },
    [params.managerId, params.managerName, params.siteId, params.siteName, params.workDate, refresh]
  )

  const approveLog = useCallback(
    async (logId: string) => {
      if (!params.managerId) return
      setSubmitting(true)
      const result = await approveSiteManagerLog({ logId, managerId: params.managerId })
      setMessage({ type: result.ok ? 'success' : 'error', text: result.message })
      setSubmitting(false)
      if (result.ok) await refresh()
    },
    [params.managerId, refresh]
  )

  const rejectLog = useCallback(
    async (input: { logId: string; workerId: string; reason: string }) => {
      if (!params.managerId) return
      setSubmitting(true)
      const result = await rejectSiteManagerLog({
        logId: input.logId,
        workerId: input.workerId,
        managerId: params.managerId,
        reason: input.reason,
      })
      setMessage({ type: result.ok ? 'success' : 'error', text: result.message })
      setSubmitting(false)
      if (result.ok) await refresh()
    },
    [params.managerId, refresh]
  )

  return {
    logs,
    workers,
    summary,
    loading,
    submitting,
    message,
    refresh,
    saveAttendance,
    approveLog,
    rejectLog,
  }
}
