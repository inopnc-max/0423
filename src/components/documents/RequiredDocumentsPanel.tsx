'use client'

import { AlertCircle, CheckCircle2, Clock, FileText, UploadCloud } from 'lucide-react'
import type { RequiredDocumentItem, RequiredDocumentStatus, RequiredDocumentType } from '@/lib/documents/requiredDocuments'

const STATUS_META: Record<RequiredDocumentStatus, { label: string; className: string; icon: typeof FileText }> = {
  missing: { label: '미제출', className: 'bg-slate-100 text-slate-600', icon: FileText },
  reviewing: { label: '검토중', className: 'bg-amber-50 text-amber-700', icon: Clock },
  approved: { label: '승인완료', className: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  rejected: { label: '반려', className: 'bg-red-50 text-red-700', icon: AlertCircle },
  expired: { label: '만료', className: 'bg-red-50 text-red-700', icon: AlertCircle },
  syncing: { label: '동기화대기', className: 'bg-blue-50 text-blue-700', icon: Clock },
}
export function RequiredDocumentsPanel({
  items,
  loading,
  onUpload,
  onPreview,
}: {
  items: RequiredDocumentItem[]
  loading: boolean
  onUpload: (type: RequiredDocumentType) => void
  onPreview?: (item: RequiredDocumentItem) => void
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-navy)]">필수서류</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">서류별 제출 상태와 반려 사유를 확인합니다.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">필수서류를 불러오는 중입니다.</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
          필수서류 기준을 불러올 수 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const meta = STATUS_META[item.status]
            const Icon = meta.icon
            return (
              <div key={item.type} className="rounded-2xl border border-[var(--color-border)] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--color-text)]">{item.type}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                    </div>
                    {item.rejectionReason && (
                      <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                        반려 사유: {item.rejectionReason}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-text-tertiary)]">
                      {item.submittedAt && <span>제출 {new Date(item.submittedAt).toLocaleDateString('ko-KR')}</span>}
                      {item.approvedAt && <span>승인 {new Date(item.approvedAt).toLocaleDateString('ko-KR')}</span>}
                      {item.expiresAt && <span>만료 {new Date(item.expiresAt).toLocaleDateString('ko-KR')}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {(item.fileUrl || item.documentId) && onPreview && (
                      <button
                        type="button"
                        onClick={() => onPreview(item)}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      >
                        미리보기
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onUpload(item.type)}
                      className="inline-flex items-center justify-center gap-1 rounded-full bg-[var(--color-navy)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-navy-hover)]"
                    >
                      <UploadCloud className="h-3.5 w-3.5" strokeWidth={1.9} />
                      {item.status === 'missing' ? '업로드' : '재업로드'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
