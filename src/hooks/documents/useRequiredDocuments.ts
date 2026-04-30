'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  loadRequiredDocuments,
  uploadRequiredDocument,
  type RequiredDocumentSummary,
  type RequiredDocumentType,
} from '@/lib/documents/requiredDocuments'

type UploadParams = {
  siteId: string
  documentType: RequiredDocumentType
  file: File
}
export function useRequiredDocuments(workerId?: string | null) {
  const [summary, setSummary] = useState<RequiredDocumentSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const refresh = useCallback(async () => {
    if (!workerId) {
      setSummary(null)
      return
    }
    setLoading(true)
    const next = await loadRequiredDocuments(workerId)
    setSummary(next)
    setLoading(false)
  }, [workerId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const submit = useCallback(
    async (params: UploadParams) => {
      if (!workerId) {
        setMessage({ type: 'error', text: '사용자 정보를 확인할 수 없습니다.' })
        return
      }

      setSubmitting(true)
      setMessage(null)
      const result = await uploadRequiredDocument({
        workerId,
        siteId: params.siteId,
        documentType: params.documentType,
        file: params.file,
      })
      setMessage({ type: result.ok ? 'success' : 'error', text: result.message })
      setSubmitting(false)
      if (result.ok) await refresh()
    },
    [refresh, workerId]
  )

  return {
    summary,
    loading,
    submitting,
    message,
    refresh,
    submit,
  }
}
