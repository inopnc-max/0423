/**
 * 현장 상태값 중앙 정의
 * sites.status 필드 값의 라벨과 배지 스타일을 한 곳에서 관리합니다.
 * 상태 추가/변경 시 이 파일만 수정하면 UI 전체에 동일하게 반영됩니다.
 */

export interface SiteStatusConfig {
  label: string
  badgeClass: string
}

export const SITE_STATUS_MAP: Record<string, SiteStatusConfig> = {
  예정: {
    label: '예정',
    badgeClass: 'ui-badge--navy',
  },
  완료: {
    label: '완료',
    badgeClass: 'ui-badge--success',
  },
  진행: {
    label: '진행',
    badgeClass: 'ui-badge--info',
  },
}

export function getSiteStatusConfig(status: string): SiteStatusConfig {
  return (
    SITE_STATUS_MAP[status] ?? {
      label: status || '알 수 없음',
      badgeClass: 'ui-badge--navy',
    }
  )
}

export const SITE_STATUS_OPTIONS = Object.keys(SITE_STATUS_MAP)
