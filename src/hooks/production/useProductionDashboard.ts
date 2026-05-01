'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getProductionDashboardRecords,
  saveProductionEntry,
  type ProductionDashboardRecords,
  type ProductionEntrySaveInput,
} from '@/lib/production/productionRecords'
import { createClient } from '@/lib/supabase/client'

export function useProductionDashboard() {
  const [records, setRecords] = useState<ProductionDashboardRecords | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getProductionDashboardRecords(createClient())
      setRecords(data)
    } catch (err) {
      console.error('[useProductionDashboard] failed to load production dashboard:', err)
      setRecords(null)
      setError('생산관리 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { records, loading, error, reload, saveEntry: saveProductionEntry }
}
