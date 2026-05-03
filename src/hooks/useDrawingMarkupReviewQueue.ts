'use client'

import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useSelectedSite } from '@/contexts/selected-site-context'
import {
  listDrawingMarkupReviewQueue,
  type DrawingMarkupReviewQueueItem,
} from '@/lib/drawing-markup-records'
import { createClient } from '@/lib/supabase/client'

type DrawingMarkupReviewQueueState = {
  loading: boolean
  error: string | null
}

function assertReviewQueueAllowed(role?: string | null): void {
  if (role !== 'admin' && role !== 'site_manager') {
    throw new Error('Only admin or site_manager can access the drawing markup review queue')
  }
}

export function useDrawingMarkupReviewQueue() {
  const { user } = useAuth()
  const { selectedSiteId } = useSelectedSite()
  const [state, setState] = useState<DrawingMarkupReviewQueueState>({
    loading: false,
    error: null,
  })

  const isSiteManager = user?.role === 'site_manager'
  const siteScope = useMemo(
    () => (isSiteManager ? selectedSiteId ?? null : null),
    [isSiteManager, selectedSiteId]
  )

  const loadPendingQueue = useCallback(async (): Promise<DrawingMarkupReviewQueueItem[]> => {
    assertReviewQueueAllowed(user?.role)
    setState({ loading: true, error: null })

    try {
      return await listDrawingMarkupReviewQueue(createClient(), {
        status: 'pending',
        approvalStatus: 'pending',
        siteId: siteScope,
        limit: 50,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load drawing markup review queue'
      setState({ loading: false, error: message })
      throw err
    } finally {
      setState(current => ({ ...current, loading: false }))
    }
  }, [siteScope, user?.role])

  return {
    ...state,
    isSiteManager,
    siteScope,
    loadPendingQueue,
  }
}
