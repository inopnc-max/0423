'use client'

import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useSelectedSite } from '@/contexts/selected-site-context'
import {
  approveDrawingMarkup,
  listDrawingMarkupReviewQueue,
  rejectDrawingMarkup,
  type DrawingMarkupRecord,
  type DrawingMarkupReviewQueueItem,
} from '@/lib/drawing-markup-records'
import { createClient } from '@/lib/supabase/client'

type DrawingMarkupReviewQueueState = {
  loading: boolean
  submitting: boolean
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
    submitting: false,
    error: null,
  })

  const isSiteManager = user?.role === 'site_manager'
  const siteScope = useMemo(
    () => (isSiteManager ? selectedSiteId ?? null : null),
    [isSiteManager, selectedSiteId]
  )

  const loadPendingQueue = useCallback(async (): Promise<DrawingMarkupReviewQueueItem[]> => {
    assertReviewQueueAllowed(user?.role)
    setState(current => ({ ...current, loading: true, error: null }))

    try {
      return await listDrawingMarkupReviewQueue(createClient(), {
        status: 'pending',
        approvalStatus: 'pending',
        siteId: siteScope,
        limit: 50,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load drawing markup review queue'
      setState(current => ({ ...current, loading: false, error: message }))
      throw err
    } finally {
      setState(current => ({ ...current, loading: false }))
    }
  }, [siteScope, user?.role])

  const approvePending = useCallback(async (id: string): Promise<DrawingMarkupRecord> => {
    assertReviewQueueAllowed(user?.role)
    if (!user?.userId) {
      throw new Error('User is required to approve drawing markups')
    }

    setState(current => ({ ...current, submitting: true, error: null }))

    try {
      return await approveDrawingMarkup(createClient(), {
        id,
        actorId: user.userId,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve drawing markup'
      setState(current => ({ ...current, error: message }))
      throw err
    } finally {
      setState(current => ({ ...current, submitting: false }))
    }
  }, [user?.role, user?.userId])

  const rejectPending = useCallback(async (
    id: string,
    reason: string
  ): Promise<DrawingMarkupRecord> => {
    assertReviewQueueAllowed(user?.role)
    if (!user?.userId) {
      throw new Error('User is required to reject drawing markups')
    }

    setState(current => ({ ...current, submitting: true, error: null }))

    try {
      return await rejectDrawingMarkup(createClient(), {
        id,
        actorId: user.userId,
        reason,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject drawing markup'
      setState(current => ({ ...current, error: message }))
      throw err
    } finally {
      setState(current => ({ ...current, submitting: false }))
    }
  }, [user?.role, user?.userId])

  return {
    ...state,
    isSiteManager,
    siteScope,
    loadPendingQueue,
    approvePending,
    rejectPending,
  }
}
