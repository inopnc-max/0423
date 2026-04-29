'use client'

import { ReportPreviewWorkspace } from '@/components/preview/ReportPreviewWorkspace'
import type { ConfirmSheetDraft } from './types'
import { ConfirmSheetPdfTemplate } from './ConfirmSheetPdfTemplate'

interface ConfirmSheetA4PreviewProps {
  draft: ConfirmSheetDraft
  siteName?: string
  workDate?: string
  readonly?: boolean
}

/**
 * ConfirmSheetA4Preview - 확인서 A4 미리보기 렌더러
 *
 * - ReportPreviewWorkspace 기반 표준 레이아웃
 * - ConfirmSheetPdfTemplate 재사용
 * - siteName, workDate를 meta strip에 표시
 * - 읽기 전용 (PDF 생성, Storage 업로드, documents insert는 부모에서 처리)
 */
export function ConfirmSheetA4Preview({
  draft,
  siteName,
  workDate,
  readonly = true,
}: ConfirmSheetA4PreviewProps) {
  const isValid = !!(
    draft.siteId &&
    draft.projectName &&
    draft.workContent &&
    draft.signatureDataUrl &&
    draft.signerName
  )

  return (
    <ReportPreviewWorkspace
      kind="confirm_sheet"
      title={draft.projectName || '작업완료확인서'}
      siteName={siteName}
      siteId={draft.siteId}
      workDate={workDate}
      status="draft"
    >
      <div className="overflow-x-auto rounded-lg bg-white shadow-md">
        <ConfirmSheetPdfTemplate draft={draft} showPlaceholder={!isValid} />
      </div>
    </ReportPreviewWorkspace>
  )
}

/* =====================================================================
   Legacy wrapper — 입력 모드 실시간 미리보기에 사용 (단독 레이아웃)
   ===================================================================== */
interface ConfirmationA4PreviewWrapperProps {
  children: React.ReactNode
  title?: string
}

/**
 * ConfirmationA4PreviewWrapper - 입력 모드용 A4 미리보기 래퍼
 *
 * 입력 폼 하단에 단순 A4 영역을 표시하는 용도.
 * ReportPreviewWorkspace 미포함 (입력 모드는 meta strip이 불필요).
 */
export function ConfirmationA4PreviewWrapper({
  children,
  title = 'A4 미리보기',
}: ConfirmationA4PreviewWrapperProps) {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
      aria-label="확인서 A4 미리보기 영역"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
        <span className="text-xs text-[var(--color-text-secondary)]">
          PDF 저장 전 미리보기
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg bg-white p-2">
        <div className="mx-auto w-[794px] max-w-full origin-top">
          {children}
        </div>
      </div>
    </section>
  )
}
