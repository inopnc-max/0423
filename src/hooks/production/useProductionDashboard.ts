'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getProductionDashboardRecords,
  saveProductionEntry,
  updateProductionEntry,
  deleteProductionEntry,
  type ProductionDashboardRecords,
  type ProductionEntrySaveInput,
  type ProductionEntryUpdateInput,
  type SaveProductionEntryResult,
  type UpdateProductionEntryResult,
} from '@/lib/production/productionRecords'
import { createClient } from '@/lib/supabase/client'

export function useProductionDashboard() {
  const [records, setRecords] = useState<ProductionDashboardRecords | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id)
    }).catch(() => {})
  }, [reload])

  const saveEntry = useCallback(async (input: ProductionEntrySaveInput): Promise<SaveProductionEntryResult> => {
    const userId = currentUserId
    if (!userId) {
      const { data } = await createClient().auth.getUser()
      if (!data.user) throw new Error('User not authenticated')
      setCurrentUserId(data.user.id)
      return saveProductionEntry(createClient(), { ...input, createdBy: data.user.id })
    }
    return saveProductionEntry(createClient(), { ...input, createdBy: userId })
  }, [currentUserId])

  const updateEntry = useCallback(async (id: string, input: ProductionEntryUpdateInput): Promise<UpdateProductionEntryResult> => {
    const userId = currentUserId
    if (!userId) {
      const { data } = await createClient().auth.getUser()
      if (!data.user) throw new Error('User not authenticated')
      setCurrentUserId(data.user.id)
      return updateProductionEntry(createClient(), id, { ...input, createdBy: data.user.id })
    }
    return updateProductionEntry(createClient(), id, { ...input, createdBy: userId })
  }, [currentUserId])

  const deleteEntry = useCallback(async (id: string) => {
    await deleteProductionEntry(createClient(), id)
  }, [])

  return {
    records,
    loading,
    error,
    reload,
    currentUserId,
    saveEntry,
    updateEntry,
    deleteEntry,
  }
}
