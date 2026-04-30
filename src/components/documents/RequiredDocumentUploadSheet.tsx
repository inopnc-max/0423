'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { REQUIRED_DOCUMENT_TYPES, type RequiredDocumentType } from '@/lib/documents/requiredDocuments'

export function RequiredDocumentUploadSheet({
  open,
  initialType,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean
  initialType?: RequiredDocumentType | null
  submitting: boolean
  onClose: () => void
  onSubmit: (params: { documentType: RequiredDocumentType; file: File }) => void
}) {
  const [documentType, setDocumentType] = useState<RequiredDocumentType>(initialType ?? '신분증')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (initialType) setDocumentType(initialType)
  }, [initialType])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 shadow-xl md:left-1/2 md:top-1/2 md:bottom-auto md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-navy)]">필수서류 업로드</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">서류 유형과 파일을 선택해 제출합니다.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--color-text-secondary)] hover:bg-slate-100">
            <X className="h-5 w-5" strokeWidth={1.9} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[var(--color-text)]">서류 유형</span>
            <select
              value={documentType}
              onChange={event => setDocumentType(event.target.value as RequiredDocumentType)}
              className="w-full rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
            >
              {REQUIRED_DOCUMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[var(--color-text)]">파일</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={event => setFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm"
            />
          </label>

          {file && (
            <div className="rounded-xl bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)}MB
            </div>
          )}

          <button
            type="button"
            disabled={!file || submitting}
            onClick={() => {
              if (!file) return
              onSubmit({ documentType, file })
            }}
            className="w-full rounded-xl bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-navy-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '제출 중...' : '제출'}
          </button>
        </div>
      </div>
    </div>
  )
}
