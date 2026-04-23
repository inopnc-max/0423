'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { getSiteStatusConfig } from '@/lib/site-status'

interface SiteStatusBadgeProps {
  status: string
  /** 기본 badge 스타일 외에 추가 class를 지정할 때 사용 */
  className?: string
  /** 툴팁을 항상 보여줄지 여부 (기본: hover) */
  alwaysShowTooltip?: boolean
}

export function SiteStatusBadge({
  status,
  className = '',
  alwaysShowTooltip = false,
}: SiteStatusBadgeProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false)

  const config = getSiteStatusConfig(status)

  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.badgeClass} ${className}`}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      {config.label}

      <button
        type="button"
        aria-label={`${config.label} 상태 설명`}
        className="cursor-help rounded-full p-0.5 text-current opacity-60 transition-opacity hover:opacity-100 focus:outline-none"
        onClick={e => {
          e.stopPropagation()
          setTooltipVisible(prev => !prev)
        }}
      >
        <HelpCircle className="h-3 w-3" strokeWidth={2} />
      </button>

      {(tooltipVisible || alwaysShowTooltip) && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-xs -translate-x-1/2 whitespace-pre-wrap rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-[var(--color-text-secondary)] shadow-lg ring-1 ring-black/5"
        >
          {config.description}
          <span
            className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-gray-200 bg-white"
            aria-hidden
          />
        </span>
      )}
    </span>
  )
}
