'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { ConfirmSheetDraft } from './types'

interface ConfirmSheetPdfTemplateProps {
  draft: ConfirmSheetDraft
  showPlaceholder?: boolean
}

/**
 * A4 작업완료확인서 PDF 렌더링 템플릿
 * - A4 세로 비율 (1:√2 ≈ 1:1.414)
 * - 한글 양식 형태
 * - 입력값 동적 반영
 * - PDF 생성 시에도 동일한 구조 사용
 */
export function ConfirmSheetPdfTemplate({ draft, showPlaceholder = false }: ConfirmSheetPdfTemplateProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'yyyy년 M월 d일', { locale: ko })
    } catch {
      return dateStr
    }
  }

  const formatPeriod = () => {
    if (!draft.periodStart && !draft.periodEnd) return '-'
    const start = draft.periodStart ? formatDate(draft.periodStart) : ''
    const end = draft.periodEnd ? formatDate(draft.periodEnd) : ''
    return `${start} ~ ${end}`
  }

  // placeholder 표시 여부
  const val = (value: string, placeholder: string) => {
    if (showPlaceholder && !value) return placeholder
    return value || '-'
  }

  return (
    <div className="p-4 h-full flex flex-col">
      {/* 제목 */}
      <h1 className="text-center text-xl font-bold mb-6 text-[var(--color-navy)]">
        작 업 완 료 확 인 서
      </h1>

      {/* 수신처 */}
      <div className="mb-4">
        <p className="text-sm font-medium text-[var(--color-text-main)]">
          수신: <span className="font-bold">{val(draft.companyName, '(수신 회사명)')}</span> 귀중
        </p>
      </div>

      {/* 기본 정보 테이블 */}
      <table className="w-full border-collapse border border-[var(--color-border)] mb-4 text-xs">
        <tbody>
          {/* 현장명 */}
          <tr>
            <td className="w-20 bg-[var(--color-bg-soft)] p-2 font-bold text-center border border-[var(--color-border)]">현장명</td>
            <td className="p-2 border border-[var(--color-border)]">{val(draft.siteName, '(현장명)')}</td>
            <td className="w-16 bg-[var(--color-bg-soft)] p-2 font-bold text-center border border-[var(--color-border)]">업체</td>
            <td className="p-2 border border-[var(--color-border)]">{val(draft.companyName, '(업체명)')}</td>
          </tr>
          {/* 공사명 */}
          <tr>
            <td className="bg-[var(--color-bg-soft)] p-2 font-bold text-center border border-[var(--color-border)]">공사명</td>
            <td className="p-2 border border-[var(--color-border)]">{val(draft.projectName, '(공사명)')}</td>
            <td className="bg-[var(--color-bg-soft)] p-2 font-bold text-center border border-[var(--color-border)]">공사기간</td>
            <td className="p-2 border border-[var(--color-border)]">{formatPeriod()}</td>
          </tr>
        </tbody>
      </table>

      {/* 작업내용 */}
      <div className="mb-4">
        <h2 className="text-xs font-bold mb-1 bg-[var(--color-bg-soft)] p-2">작 업 내 용</h2>
        <div className="border border-[var(--color-border)] p-3 min-h-[80px] whitespace-pre-wrap text-xs">
          {val(draft.workContent, '(작업내용을 입력하세요)')}
        </div>
      </div>

      {/* 특기사항 */}
      <div className="mb-4">
        <h2 className="text-xs font-bold mb-1 bg-[var(--color-bg-soft)] p-2">특 기 사 항</h2>
        <div className="border border-[var(--color-border)] p-3 min-h-[48px] whitespace-pre-wrap text-xs">
          {val(draft.specialNotes, '(특기사항 없음)')}
        </div>
      </div>

      {/* 고정 확인 문구 */}
      <div className="mb-4 py-3 text-center border-y border-dashed border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-secondary)]">
          상기 사항과 같이 작업을 완료하였음을 확인합니다.
        </p>
      </div>

      {/* 확인자 정보 */}
      <div className="mb-4">
        <table className="w-full border-collapse border border-[var(--color-border)] text-xs">
          <tbody>
            <tr>
              <td className="w-20 bg-[var(--color-bg-soft)] p-2 font-bold text-center border border-[var(--color-border)]">작업일</td>
              <td className="p-2 border border-[var(--color-border)]" colSpan={3}>{formatDate(draft.workDate)}</td>
            </tr>
            <tr>
              <td className="bg-[var(--color-bg-soft)] p-2 font-bold text-center border border-[var(--color-border)]">소속</td>
              <td className="p-2 border border-[var(--color-border)]">{val(draft.affiliation, '(소속)')}</td>
              <td className="w-16 bg-[var(--color-bg-soft)] p-2 font-bold text-center border border-[var(--color-border)]">성명</td>
              <td className="p-2 border border-[var(--color-border)]">{val(draft.signerName, '(성명)')}</td>
            </tr>
            <tr>
              <td className="bg-[var(--color-bg-soft)] p-2 font-bold text-center border border-[var(--color-border)]">서명</td>
              <td className="p-2 border border-[var(--color-border)]" colSpan={3}>
                {draft.signatureDataUrl ? (
                  <img src={draft.signatureDataUrl} alt="서명" className="h-12 object-contain" />
                ) : (
                  <span className="text-[var(--color-text-tertiary)] text-xs">(서명 없음)</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 발행일 */}
      <div className="mt-auto text-right text-xs text-[var(--color-text-tertiary)]">
        <p>발행일: {format(new Date(), 'yyyy년 M월 d일', { locale: ko })}</p>
      </div>
    </div>
  )
}
