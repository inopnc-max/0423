'use client'

import { FileCheck2, FileText, ShieldCheck } from 'lucide-react'
import {
  filterPartnerDocumentsByView,
  isPartnerReportDocument,
  type PartnerDocumentView,
  type PartnerVisibleDocument,
} from '@/lib/documents/partnerDocuments'

interface PartnerDocumentOverviewProps {
  documents: PartnerVisibleDocument[]
  activeView: PartnerDocumentView
  onViewChange: (view: PartnerDocumentView) => void
}

export function PartnerDocumentOverview({
  documents,
  activeView,
  onViewChange,
}: PartnerDocumentOverviewProps) {
  const reports = documents.filter(isPartnerReportDocument).length
  const general = documents.length - reports

  const tabs: Array<{
    view: PartnerDocumentView
    label: string
    count: number
    icon: typeof FileText
  }> = [
    { view: 'all', label: '전체', count: documents.length, icon: ShieldCheck },
    { view: 'reports', label: '보고서', count: reports, icon: FileCheck2 },
    { view: 'documents', label: '문서', count: general, icon: FileText },
  ]

  return (
    <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[var(--color-navy)]">읽기전용 문서함</div>
          <p className="mt-1 text-sm leading-5 text-[var(--color-text-secondary)]">
            승인완료 또는 최종본 문서만 표시합니다. 개인서류와 급여 문서는 제외됩니다.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {tabs.map(({ view, label, count, icon: Icon }) => {
          const active = activeView === view
          return (
            <button
              key={view}
              type="button"
              onClick={() => onViewChange(view)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-navy)]'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
              }`}
            >
              <Icon className="mb-2 h-4 w-4" strokeWidth={1.9} />
              <span className="block text-xs font-medium">{label}</span>
              <span className="mt-1 block text-lg font-bold">{count}</span>
            </button>
          )
        })}
      </div>

      {filterPartnerDocumentsByView(documents, activeView).length === 0 && documents.length > 0 && (
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          선택한 분류에 표시할 자료가 없습니다.
        </p>
      )}
    </section>
  )
}
