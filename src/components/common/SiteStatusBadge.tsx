import { getSiteStatusConfig } from '@/lib/site-status'

interface SiteStatusBadgeProps {
  status: string
  /** 기본 badge 스타일 외에 추가 class를 지정할 때 사용 */
  className?: string
}

export function SiteStatusBadge({ status, className = '' }: SiteStatusBadgeProps) {
  const config = getSiteStatusConfig(status)

  return (
    <span
      className={`ui-badge whitespace-nowrap ${config.badgeClass} ${className}`}
      aria-label={`현장 상태 ${config.label}`}
    >
      {config.label}
    </span>
  )
}
