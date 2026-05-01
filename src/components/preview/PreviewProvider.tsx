'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { Role } from '@/lib/roles'
import type { PreviewConfig, PreviewContextValue } from './preview-types'

const PreviewContext = createContext<PreviewContextValue | null>(null)

function sanitizePreviewConfig(config: PreviewConfig, role?: Role): PreviewConfig {
  if (role !== 'partner') {
    return config
  }

  return {
    ...config,
    dockMode: 'readonly',
    onSave: undefined,
    onSign: undefined,
    onSubmit: undefined,
    onLock: undefined,
    onUnlock: undefined,
  }
}

export function PreviewProvider({
  children,
  role,
}: {
  children: React.ReactNode
  role?: Role
}) {
  const [preview, setPreview] = useState<PreviewConfig | null>(null)

  const openPreview = useCallback(
    (config: PreviewConfig) => {
      setPreview(sanitizePreviewConfig(config, role))
    },
    [role]
  )

  const closePreview = useCallback(() => {
    setPreview(null)
  }, [])

  const value = useMemo<PreviewContextValue>(
    () => ({
      preview,
      role,
      openPreview,
      closePreview,
    }),
    [preview, role, openPreview, closePreview]
  )

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
}

export function usePreview() {
  const context = useContext(PreviewContext)

  if (!context) {
    throw new Error('usePreview must be used within a PreviewProvider')
  }

  return context
}

