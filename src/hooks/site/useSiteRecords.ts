'use client'

import { useEffect, useState } from 'react'
import {
  loadApprovedDailyLogs,
  loadIssueReports,
  type ApprovedDailyLogRow,
  type IssueReportRow,
} from '@/lib/site/siteRecords'

export function useApprovedDailyLogs(siteId: string | null) {
  const [logs, setLogs] = useState<ApprovedDailyLogRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!siteId) {
      setLogs([])
      return
    }

    let cancelled = false
    const currentSiteId = siteId

    async function load() {
      setLoading(true)
      const rows = await loadApprovedDailyLogs(currentSiteId)
      if (!cancelled) {
        setLogs(rows)
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [siteId])

  return { logs, loading }
}

export function useIssueReports(siteId: string | null) {
  const [reports, setReports] = useState<IssueReportRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!siteId) {
      setReports([])
      return
    }

    let cancelled = false
    const currentSiteId = siteId

    async function load() {
      setLoading(true)
      const rows = await loadIssueReports(currentSiteId)
      if (!cancelled) {
        setReports(rows)
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [siteId])

  return { reports, loading }
}
