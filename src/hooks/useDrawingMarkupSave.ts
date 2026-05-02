'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  getDrawingMarkupBySource,
  listDrawingMarkupsByWorklog,
  saveDrawingMarkupDraft,
  submitDrawingMarkupForReview,
  type DrawingMarkupRecord,
  type DrawingMarkupSourceKey,
  type SaveDrawingMarkupDraftInput,
} from '@/lib/drawing-markup-records'
import { createClient } from '@/lib/supabase/client'

type DrawingMarkupSaveState = {
  loading: boolean
  saving: boolean
  submitting: boolean
  error: string | null
}

function assertRawDrawingMarkupAllowed(role?: string | null): void {
  if (role === 'partner') {
    throw new Error('Partner users can only access approved drawing markup documents')
  }
}

export function useDrawingMarkupSave() {
  const { user } = useAuth()
  const [state, setState] = useState<DrawingMarkupSaveState>({
    loading: false,
    saving: false,
    submitting: false,
    error: null,
  })

  const loadBySource = useCallback(async (source: DrawingMarkupSourceKey): Promise<DrawingMarkupRecord | null> => {
    assertRawDrawingMarkupAllowed(user?.role)
    setState(current => ({ ...current, loading: true, error: null }))

    try {
      return await getDrawingMarkupBySource(createClient(), source)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load drawing markup'
      setState(current => ({ ...current, error: message }))
      throw err
    } finally {
      setState(current => ({ ...current, loading: false }))
    }
  }, [user?.role])

  const loadByWorklog = useCallback(async (input: {
    siteId: string
    worklogId: string
  }): Promise<DrawingMarkupRecord[]> => {
    assertRawDrawingMarkupAllowed(user?.role)
    setState(current => ({ ...current, loading: true, error: null }))

    try {
      return await listDrawingMarkupsByWorklog(createClient(), input)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load drawing markups'
      setState(current => ({ ...current, error: message }))
      throw err
    } finally {
      setState(current => ({ ...current, loading: false }))
    }
  }, [user?.role])

  const saveDraft = useCallback(async (
    input: Omit<SaveDrawingMarkupDraftInput, 'createdBy'>
  ): Promise<DrawingMarkupRecord> => {
    assertRawDrawingMarkupAllowed(user?.role)

    if (!user?.userId) {
      throw new Error('User is required to save drawing markup drafts')
    }

    setState(current => ({ ...current, saving: true, error: null }))

    try {
      return await saveDrawingMarkupDraft(createClient(), {
        ...input,
        createdBy: user.userId,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save drawing markup draft'
      setState(current => ({ ...current, error: message }))
      throw err
    } finally {
      setState(current => ({ ...current, saving: false }))
    }
  }, [user?.role, user?.userId])

  const submitForReview = useCallback(async (id: string): Promise<DrawingMarkupRecord> => {
    assertRawDrawingMarkupAllowed(user?.role)
    setState(current => ({ ...current, submitting: true, error: null }))

    try {
      return await submitDrawingMarkupForReview(createClient(), { id })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit drawing markup'
      setState(current => ({ ...current, error: message }))
      throw err
    } finally {
      setState(current => ({ ...current, submitting: false }))
    }
  }, [user?.role])

  return {
    ...state,
    loadBySource,
    loadByWorklog,
    saveDraft,
    submitForReview,
  }
}
