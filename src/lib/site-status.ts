/**
 * 현장 상태값 중앙 정의
 * sites.status 필드 값의 라벨, 색상, 도움말 설명을 한 곳에서 관리합니다.
 * 현장명옆 ? 아이콘의 툴팁 설명도 이 파일이 단일 진실 원천입니다.
 */

export interface SiteStatusConfig {
  label: string
  badgeClass: string
  description: string
}

export const SITE_STATUS_MAP: Record<string, SiteStatusConfig> = {
  예정: {
    label: '예정',
    badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
    description: '아직 착공 전이거나 예약된 현장입니다.',
  },
  완료: {
    label: '완료',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    description: '모든 시공 또는 작업이 완료된 현장입니다.',
  },
  진행: {
    label: '진행',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    description: '현재 시공 또는 작업이 진행 중인 현장입니다.',
  },
}

export function getSiteStatusConfig(status: string): SiteStatusConfig {
  return (
    SITE_STATUS_MAP[status] ?? {
      label: status || '알 수 없음',
      badgeClass: 'bg-gray-50 text-gray-600 border border-gray-200',
      description: '상태 정보가 없습니다.',
    }
  )
}

export const SITE_STATUS_OPTIONS = Object.keys(SITE_STATUS_MAP)
