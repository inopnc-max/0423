'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getProductionLogsEntries,
  getProductionLogsRecords,
  type ProductionEntryType,
  type ProductionRecentEntry,
  type ProductionReferenceOption,
} from '@/lib/production/productionRecords'
import { createClient } from '@/lib/supabase/client'

const PAGE_SIZE = 20

interface ProductionLogsState {
  entries: ProductionRecentEntry[]
  totalCount: number
  sites: ProductionReferenceOption[]
  products: ProductionReferenceOption[]
  loading: boolean
  error: string | null
  currentPage: number
  startDate: string
  endDate: string
  selectedType: ProductionEntryType | ''
}

export function useProductionLogs() {
  const [state, setState] = useState<ProductionLogsState>(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    return {
      entries: [],
      totalCount: 0,
      sites: [],
      products: [],
      loading: true,
      error: null,
      currentPage: 0,
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      selectedType: '',
    }
  })

  const loadEntries = useCallback(async (refreshState?: Partial<ProductionLogsState>) => {
    setState(prev => ({ ...prev, loading: true, error: null, ...refreshState }))

    const currentState = refreshState
      ? { ...state, ...refreshState }
      : state

    const offset = currentState.currentPage * PAGE_SIZE

    try {
      const [entriesResult, recordsResult] = await Promise.all([
        getProductionLogsEntries(createClient(), {
          startDate: currentState.startDate || undefined,
          endDate: currentState.endDate || undefined,
          type: currentState.selectedType || undefined,
          limit: PAGE_SIZE,
          offset,
        }),
        getProductionLogsRecords(createClient()),
      ])

      setState(prev => ({
        ...prev,
        entries: entriesResult.entries,
        totalCount: entriesResult.totalCount,
        sites: recordsResult.sites,
        products: recordsResult.products,
        loading: false,
      }))
    } catch (err) {
      console.error('[useProductionLogs] failed to load:', err)
      setState(prev => ({
        ...prev,
        loading: false,
        error: '생산 내역을 불러오지 못했습니다.',
      }))
    }
  }, [state])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  const setStartDate = useCallback((date: string) => {
    setState(prev => ({ ...prev, startDate: date, currentPage: 0 }))
  }, [])

  const setEndDate = useCallback((date: string) => {
    setState(prev => ({ ...prev, endDate: date, currentPage: 0 }))
  }, [])

  const setSelectedType = useCallback((type: ProductionEntryType | '') => {
    setState(prev => ({ ...prev, selectedType: type, currentPage: 0 }))
  }, [])

  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }))
  }, [])

  const reload = useCallback(() => {
    void loadEntries()
  }, [loadEntries])

  const totalPages = Math.ceil(state.totalCount / PAGE_SIZE)
  const hasNextPage = state.currentPage < totalPages - 1
  const hasPrevPage = state.currentPage > 0

  return {
    ...state,
    setStartDate,
    setEndDate,
    setSelectedType,
    setPage,
    reload,
    pageSize: PAGE_SIZE,
    hasNextPage,
    hasPrevPage,
    totalPages,
  }
}
