'use client'

import { useEffect, useState } from 'react'
import {
  getProductionDashboardRecords,
  type ProductionDashboardRecords,
} from '@/lib/production/productionRecords'
import { createClient } from '@/lib/supabase/client'

export function useProductionDashboard() {
  const [records, setRecords] = useState<ProductionDashboardRecords | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await getProductionDashboardRecords(createClient())
        if (!cancelled) setRecords(data)
      } catch (err) {
        console.error('[useProductionDashboard] failed to load production dashboard:', err)
        if (!cancelled) {
          setRecords(null)
          setError('생산관리 정보를 불러오지 못했습니다.')
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
