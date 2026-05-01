'use client'

import { useMemo } from 'react'
import { Wallet, Calendar, User } from 'lucide-react'
import { ReportPreviewWorkspace } from '../ReportPreviewWorkspace'
import type { SalaryStatementDocument } from './report-document-types'

interface SalaryStatementPreviewProps {
  document: SalaryStatementDocument
}

/**
 * SalaryStatementPreview - Read-only salary statement renderer.
 * Renders salary/pay statement with attendance sections and pay summary in A4 paper layout.
 */
export function SalaryStatementPreview({ document }: SalaryStatementPreviewProps) {
  const {
    title,
    siteId,
    siteName,
    workerName,
    workMonth,
    status,
    sections,
    totalMandays,
    totalPay,
  } = document

  const formattedMonth = useMemo(() => {
    if (!workMonth) return ''
    const [year, month] = workMonth.split('-')
    if (!year || !month) return workMonth
    return `${year}년 ${parseInt(month, 10)}월`
  }, [workMonth])

  const formattedPay = useMemo(() => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(totalPay)
  }, [totalPay])

  return (
    <ReportPreviewWorkspace
      kind="salary_statement"
      title={title}
      siteId={siteId}
      siteName={siteName}
      status={status}
    >
      <div className="flex flex-col gap-4">
        {/* Worker & Month Info */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{workerName}</span>
          </div>
          {formattedMonth && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
              <span className="text-sm text-[var(--color-text-secondary)]">{formattedMonth}</span>
            </div>
          )}
          {siteName && (
            <span className="ml-auto text-sm text-[var(--color-text-tertiary)]">{siteName}</span>
          )}
        </div>

        {/* Attendance Sections */}
        {sections.length > 0 ? (
          <div className="space-y-3">
            {sections.map((section, idx) => (
              <div key={idx} className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
                <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2.5">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{section.title}</span>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {section.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                        item.isBold ? 'font-semibold bg-[var(--color-bg-soft)]' : ''
                      }`}
                    >
                      <span className={`${item.isBold ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                        {item.label}
                      </span>
                      <span className={`font-medium ${item.isBold ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text)]'}`}>
                        {typeof item.value === 'number'
                          ? item.value.toLocaleString('ko-KR')
                          : item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center">
            <p className="text-sm text-[var(--color-text-tertiary)]">급여 항목이 없습니다.</p>
          </div>
        )}

        {/* Summary */}
        <div className="rounded-xl border-2 border-[var(--color-accent)] bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--color-accent)] bg-[var(--color-accent-light)] px-4 py-3">
            <Wallet className="h-5 w-5 text-[var(--color-accent)]" strokeWidth={1.9} />
            <span className="font-semibold text-[var(--color-navy)]">급여 요약</span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-[var(--color-text-secondary)]">총 공수</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{totalMandays}일</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-[var(--color-text-secondary)]">총 지급액</span>
              <span className="text-xl font-bold text-[var(--color-navy)]">{formattedPay}</span>
            </div>
          </div>
        </div>
      </div>
    </ReportPreviewWorkspace>
  )
}
