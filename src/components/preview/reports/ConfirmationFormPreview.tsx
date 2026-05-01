'use client'

import { FileText, User, Building2, Calendar } from 'lucide-react'
import { ReportPreviewWorkspace } from '../ReportPreviewWorkspace'
import type { ConfirmationFormDocument } from './report-document-types'

interface ConfirmationFormPreviewProps {
  document: ConfirmationFormDocument
}

/**
 * ConfirmationFormPreview - Read-only confirmation form renderer.
 * Renders a confirmation document with basic info, content, custom fields, and signatures.
 */
export function ConfirmationFormPreview({ document }: ConfirmationFormPreviewProps) {
  const {
    title,
    siteId,
    siteName,
    workDate,
    status,
    inputData,
    formType,
    documentNo,
  } = document

  const { basicInfo, content, customFields, signatures } = inputData

  const formTypeLabel: Record<string, string> = {
    confirmation: '확인서',
    work_confirmation: '작업 확인서',
    custom: '사용자 정의',
  }

  const renderSignature = (sig: NonNullable<typeof signatures>[number], idx: number) => (
    <div key={sig.id ?? idx} className="flex flex-col items-center gap-1">
      <div className="h-12 w-36 rounded border-2 border-dashed border-[var(--color-border)] flex items-center justify-center bg-slate-50">
        {sig.signatureDataUrl ? (
          <img
            src={sig.signatureDataUrl}
            alt={sig.signerName ?? sig.label}
            className="max-h-10 max-w-full object-contain"
          />
        ) : sig.signaturePath ? (
          <span className="text-xs text-[var(--color-text-tertiary)]">서명 이미지</span>
        ) : (
          <span className="text-xs text-[var(--color-text-tertiary)]">미서명</span>
        )}
      </div>
      <span className="text-xs font-medium text-[var(--color-text-secondary)]">
        {sig.signerName ?? '서명자'}
      </span>
      <span className="text-[10px] text-[var(--color-text-tertiary)]">{sig.label}</span>
      {sig.signedAt && (
        <span className="text-[9px] text-[var(--color-text-tertiary)]">
          {new Date(sig.signedAt).toLocaleDateString('ko-KR')}
        </span>
      )}
    </div>
  )

  return (
    <ReportPreviewWorkspace
      kind="confirm_sheet"
      title={title}
      siteId={siteId}
      siteName={siteName}
      workDate={workDate}
      status={status}
    >
      <div className="flex flex-col gap-4">
        {/* Document Meta */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
          <span className="rounded-full bg-[var(--color-accent-light)] px-2.5 py-1 text-xs font-semibold text-[var(--color-navy-light)]">
            {formTypeLabel[formType] ?? formType}
          </span>
          {documentNo && (
            <span className="text-sm text-[var(--color-text-secondary)]">
              문서번호: {documentNo}
            </span>
          )}
        </div>

        {/* Basic Info */}
        <div className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2.5">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">기본 정보</span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {basicInfo.projectName && (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs text-[var(--color-text-tertiary)] w-20 shrink-0">공정</span>
                <span className="text-sm text-[var(--color-text-primary)]">{basicInfo.projectName}</span>
              </div>
            )}
            {basicInfo.siteName && (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs text-[var(--color-text-tertiary)] w-20 shrink-0">현장</span>
                <span className="text-sm text-[var(--color-text-primary)]">{basicInfo.siteName}</span>
              </div>
            )}
            {basicInfo.companyName && (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Building2 className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] shrink-0" strokeWidth={1.9} />
                <span className="text-sm text-[var(--color-text-primary)]">{basicInfo.companyName}</span>
              </div>
            )}
            {basicInfo.writerName && (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <User className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] shrink-0" strokeWidth={1.9} />
                <span className="text-sm text-[var(--color-text-primary)]">{basicInfo.writerName}</span>
              </div>
            )}
            {basicInfo.contact && (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs text-[var(--color-text-tertiary)] w-20 shrink-0">연락처</span>
                <span className="text-sm text-[var(--color-text-primary)]">{basicInfo.contact}</span>
              </div>
            )}
            {basicInfo.writtenDate && (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Calendar className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] shrink-0" strokeWidth={1.9} />
                <span className="text-sm text-[var(--color-text-primary)]">
                  {new Date(basicInfo.writtenDate).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
            {Object.keys(basicInfo).length === 0 && (
              <div className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">기본 정보가 없습니다.</div>
            )}
          </div>
        </div>

        {/* Content */}
        {(content.subject || content.body || content.notes) && (
          <div className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2.5">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">내용</span>
            </div>
            <div className="p-4 space-y-3">
              {content.subject && (
                <div className="text-base font-bold text-[var(--color-navy)]">{content.subject}</div>
              )}
              {content.body && (
                <div className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)] leading-relaxed">
                  {content.body}
                </div>
              )}
              {content.notes && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700 whitespace-pre-wrap">
                  {content.notes}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Fields */}
        {customFields && customFields.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2.5">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">추가 항목</span>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {customFields.map((field, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-[var(--color-text-secondary)]">{field.label}</span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signatures */}
        {signatures && signatures.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2.5">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">서명</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 p-6">
              {signatures.map((sig, idx) => renderSignature(sig, idx))}
            </div>
          </div>
        )}
      </div>
    </ReportPreviewWorkspace>
  )
}
