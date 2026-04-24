'use client'

interface PageLoadingProps {
  message?: string
  className?: string
}

/**
 * 표준 페이지 로딩 컴포넌트
 * h-64 (256px) 높이의 중앙 정렬 로딩 UI
 */
export function PageLoading({
  message = '로딩 중...',
  className = '',
}: PageLoadingProps) {
  return (
    <div className={`flex h-64 items-center justify-center ${className}`}>
      <div className="text-[var(--color-text-secondary)]">{message}</div>
    </div>
  )
}
