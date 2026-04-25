'use client'

import { X, ChevronLeft } from 'lucide-react'

export interface PreviewHeaderProps {
  title: string
  subtitle?: string
  onClose?: () => void
  onBack?: () => void
  showBack?: boolean
  rightAction?: React.ReactNode
}

/**
 * PreviewCenter 공통 헤더
 * - 모바일: 뒤로/닫기 터치 영역 확보
 * - 웹: 중앙 정렬 레이아웃 내 고정
 */
export function PreviewHeader({
  title,
  subtitle,
  onClose,
  onBack,
  showBack = false,
  rightAction,
}: PreviewHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-[var(--color-divider)] bg-[var(--color-bg-surface)] px-4 py-3">
      {/* Left: Back button or spacer */}
      <div className="flex w-10 items-center justify-start">
        {showBack && onBack ? (
          <button
            onClick={onBack}
            className="ui-header-icon"
            aria-label="뒤로 가기"
          >
            <ChevronLeft />
          </button>
        ) : null}
      </div>

      {/* Center: Title */}
      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
        <h2 className="truncate text-base font-bold text-[var(--color-primary-strong)]">
          {title}
        </h2>
        {subtitle && (
          <p className="truncate text-xs text-[var(--color-text-sub)]">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: Close or custom action */}
      <div className="flex w-10 items-center justify-end">
        {rightAction || (
          onClose && (
            <button
              onClick={onClose}
              className="ui-header-icon"
              aria-label="닫기"
            >
              <X />
            </button>
          )
        )}
      </div>
    </header>
  )
}
