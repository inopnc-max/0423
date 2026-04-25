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
    <div
      className="bg-white p-8 md:p-12 mx-auto"
      style={{
        width: '100%',
        maxWidth: '210mm',
        aspectRatio: '210/297',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* 제목 */}
      <h1 className="text-center text-xl md:text-2xl font-bold mb-8 text-black">
        작 업 완 료 확 인 서
      </h1>

      {/* 수신처 */}
      <div className="mb-6">
        <p className="text-sm font-medium">
          수신: <span className="font-bold">{val(draft.companyName, '(수신 회사명)')}</span> 귀중
        </p>
      </div>

      {/* 기본 정보 테이블 */}
      <table className="w-full border-collapse border-2 border-black mb-6 text-sm">
        <tbody>
          {/* 현장명 */}
          <tr className="border border-black">
            <td className="w-24 bg-gray-100 p-2 font-bold text-center border-r border-black">현 장 명</td>
            <td className="p-2 border-r border-black">{val(draft.siteName, '(현장명)')}</td>
            <td className="w-24 bg-gray-100 p-2 font-bold text-center border-r border-black">업 체</td>
            <td className="p-2">{val(draft.companyName, '(업체명)')}</td>
          </tr>
          {/* 공사명 */}
          <tr className="border border-black">
            <td className="bg-gray-100 p-2 font-bold text-center border-r border-black">공 사 명</td>
            <td className="p-2 border-r border-black">{val(draft.projectName, '(공사명)')}</td>
            <td className="bg-gray-100 p-2 font-bold text-center border-r border-black">공사기간</td>
            <td className="p-2">{formatPeriod()}</td>
          </tr>
        </tbody>
      </table>

      {/* 작업내용 */}
      <div className="mb-6">
        <h2 className="text-sm font-bold mb-2 bg-gray-100 p-2 border-l-4 border-black">작 업 내 용</h2>
        <div className="border border-gray-300 p-3 min-h-[80px] whitespace-pre-wrap text-sm">
          {val(draft.workContent, '(작업내용을 입력하세요)')}
        </div>
      </div>

      {/* 특기사항 */}
      <div className="mb-6">
        <h2 className="text-sm font-bold mb-2 bg-gray-100 p-2 border-l-4 border-black">특 기 사 항</h2>
        <div className="border border-gray-300 p-3 min-h-[60px] whitespace-pre-wrap text-sm">
          {val(draft.specialNotes, '(특기사항 없음)')}
        </div>
      </div>

      {/* 고정 확인 문구 */}
      <div className="mb-8 py-4 border-y-2 border-double border-gray-400">
        <p className="text-center text-sm font-medium">
          상기 사항과 같이 작업을 완료하였음을 확인합니다.
        </p>
      </div>

      {/* 확인자 정보 */}
      <div className="mb-8">
        <table className="w-full border-collapse border-2 border-black text-sm">
          <tbody>
            <tr className="border border-black">
              <td className="w-24 bg-gray-100 p-2 font-bold text-center border-r border-black">작 업 일</td>
              <td className="p-2" colSpan={3}>{formatDate(draft.workDate)}</td>
            </tr>
            <tr className="border border-black">
              <td className="bg-gray-100 p-2 font-bold text-center border-r border-black">소 속</td>
              <td className="p-2 border-r border-black">{val(draft.affiliation, '(소속)')}</td>
              <td className="w-20 bg-gray-100 p-2 font-bold text-center border-r border-black">성 명</td>
              <td className="p-2">{val(draft.signerName, '(성명)')}</td>
            </tr>
            <tr className="border border-black">
              <td className="bg-gray-100 p-2 font-bold text-center border-r border-black">서 명</td>
              <td className="p-2" colSpan={3}>
                {draft.signatureDataUrl ? (
                  <img
                    src={draft.signatureDataUrl}
                    alt="서명"
                    className="h-16 object-contain"
                  />
                ) : (
                  <span className="text-gray-400 text-xs">(서명 없음)</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 발행일 */}
      <div className="text-right text-sm">
        <p>발행일: {format(new Date(), 'yyyy년 M월 d일', { locale: ko })}</p>
      </div>
    </div>
  )
}
