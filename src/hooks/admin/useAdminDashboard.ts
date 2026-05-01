'use client'

import { useEffect, useState } from 'react'
import { getAdminDashboardRecords, type AdminDashboardRecords } from '@/lib/admin/adminDashboardRecords'
import { createClient } from '@/lib/supabase/client'

export function useAdminDashboard() {
  const [records, setRecords] = useState<AdminDashboardRecords | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await getAdminDashboardRecords(createClient())
        if (!cancelled) setRecords(data)
      } catch (err) {
        console.error('[useAdminDashboard] failed to load admin dashboard:', err)
        if (!cancelled) {
          setRecords(null)
          setError('관리자 대시보드 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { records, loading, error }
}
