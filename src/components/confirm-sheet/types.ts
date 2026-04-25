/**
 * 작업완료확인서 Draft 상태 타입
 */
export interface ConfirmSheetDraft {
  // 현장 정보 (daily_logs에서 자동 채움)
  siteId: string
  siteName: string
  siteAddress: string
  siteManager: string

  // 입력 필드
  companyName: string      // 업체
  projectName: string      // 공사명
  periodStart: string      // 공사기간 시작
  periodEnd: string        // 공사기간 종료
  workDate: string         // 작업일
  workContent: string      // 작업내용
  specialNotes: string     // 특기사항

  // 확인자 정보
  affiliation: string      // 소속
  signerName: string      // 성명
  signatureDataUrl: string | null  // 서명 이미지

  // 메타
  createdAt: string
  updatedAt: string
}

/**
 * 초안 생성용 인터페이스 (Partial)
 */
export type ConfirmSheetDraftInput = Partial<ConfirmSheetDraft>

/**
 * Site 기본 정보
 */
export interface SiteInfo {
  id: string
  name: string
  company: string
  address: string
  manager: string
}

/**
 * DailyLog에서 추출할 자동 채움 정보
 */
export interface DailyLogInfo {
  id: string
  work_date: string
  worker_array: { name: string; count: number }[]
  task_tags: string[]
  summary?: string
}
