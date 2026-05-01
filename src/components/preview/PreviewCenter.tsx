'use client'

import { useEffect } from 'react'
import { PreviewHeader } from './PreviewHeader'
import { PreviewActionDock, type DockAction } from './PreviewActionDock'

export type PreviewMode = 'modal' | 'fullscreen'
export type PreviewContentType = 'report' | 'media' | 'file'

interface PreviewCenterProps {
  children: React.ReactNode
  mode?: PreviewMode
  contentType?: PreviewContentType
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  onClose?: () => void
  headerRightAction?: React.ReactNode
  // Dock props
  dockMode?: 'readonly' | 'edit' | 'signature'
  status?: 'draft' | 'pending' | 'approved' | 'locked' | 'rejected'
  onDownload?: () => void
  onShare?: () => void
  onSave?: () => void
  onSign?: () => void
  onSubmit?: () => void
  onLock?: () => void
  onUnlock?: () => void
  onExportPdf?: () => void
  onExportCsv?: () => void
  dockDisabled?: boolean
  customActions?: DockAction[]
  showExportMenu?: boolean
  // Backdrop
  backdropClassName?: string
  // Layout
  maxWidth?: string
}

/**
 * PreviewCenter - 도면 미리보기 컨테이너
 *
 * 3가지 모드 지원
 * 1. modal: z-index 50, backdrop, AppShell 안에 표시
 * 2. fullscreen: 전체 화면, 헤더 뒤로 가기 포함 가능
 *
 * 컨텐츠 유형
 * - report: 문서/보고서(A4 기준 영역)
 * - media: 이미지/비디오(자체 영역 사용)
 * - file: 기타 파일 (다운로드 제공)
 */
export function PreviewCenter({
  children,
  mode = 'fullscreen',
  contentType = 'report',
  title,
  subtitle,
  showBack,
  onBack,
  onClose,
  headerRightAction,
  dockMode = 'readonly',
  status,
  onDownload,
  onShare,
  onSave,
  onSign,
  onSubmit,
  onLock,
  onUnlock,
  onExportPdf,
  onExportCsv,
  dockDisabled,
  customActions,
  showExportMenu,
  backdropClassName,
  maxWidth = 'max-w-[960px]',
}: PreviewCenterProps) {
  // Lock body scroll in fullscreen mode
  useEffect(() => {
    if (mode === 'fullscreen') {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [mode])

  const isModal = mode === 'modal'

  const content = (
    <div
      className={`flex flex-col bg-[var(--color-bg-surface)] ${
        isModal
          ? `mx-auto h-[85dvh] ${maxWidth} rounded-2xl shadow-2xl`
          : 'min-h-screen'
      }`}
    >
      {/* Header */}
      <PreviewHeader
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        onBack={onBack}
        onClose={onClose}
        rightAction={headerRightAction}
      />

      {/* Body - 하단 Dock 공간이 있도록 padding 추가해서 컨텐츠가 잘리지 않도록 */}
      <div
        className={`flex-1 overflow-auto pb-[calc(100px+var(--safe-bottom))] ${
          contentType === 'report'
            ? 'bg-[var(--color-bg-soft)]'
            : 'bg-[var(--color-bg)]'
        }`}
      >
        <div className={`mx-auto ${maxWidth} px-4 py-4`}>{children}</div>
      </div>

      {/* Action Dock */}
      <PreviewActionDock
        mode={dockMode}
        status={status}
        onDownload={onDownload}
        onShare={onShare}
        onSave={onSave}
        onSign={onSign}
        onSubmit={onSubmit}
        onLock={onLock}
        onUnlock={onUnlock}
        onExportPdf={onExportPdf}
        onExportCsv={onExportCsv}
        disabled={dockDisabled}
        customActions={customActions}
        showExportMenu={showExportMenu}
      />
    </div>
  )

  if (isModal) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm ${backdropClassName}`}
        onClick={e => {
          if (e.target === e.currentTarget && onClose) {
            onClose()
          }
        }}
      >
        {content}
      </div>
    )
  }

  return content
}
