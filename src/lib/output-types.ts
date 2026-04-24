/**
 * 출역/급여 페이지에서 사용하는 도메인 타입
 * 한 곳에서 정의하여 확장/수정 시 한 파일만 변경하면 됩니다.
 */

export type SalaryHistoryEntry = {
  /** "2026-04" */
  rawDate: string
  /** "2026년 4월" */
  month: string
  /** 총액 (지급합계) */
  baseTotal: number
  /** 공수 */
  man: number
  /** 일당 단가 */
  price: number
  year: number
  /** 실수령액 */
  netPay: number
  /** 지급합계 */
  grossPay: number
  /** 공제금액 */
  deductions: number
}

export type PayStubCalculations = {
  grossPay: number
  deductions: number
  netPay: number
}

export type CalendarEntry = {
  site: string
  man: number
  price: number
  worker: string
}

export type SalaryStatus = 'pending' | 'paid' | 'draft'
