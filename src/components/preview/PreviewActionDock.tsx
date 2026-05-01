'use client'

import { useState } from 'react'
import { Download, Share2, Check, FileSignature, Save, Lock, Unlock, FileDown, Table2, ChevronDown } from 'lucide-react'

export type ExportFormat = 'pdf' | 'csv'

export interface DockAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  primary?: boolean
  disabled?: boolean
  hidden?: boolean
  title?: string
}

export interface PreviewActionDockProps {
  mode: 'readonly' | 'edit' | 'signature'
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
  disabled?: boolean
  customActions?: DockAction[]
  showExportMenu?: boolean
}

/**
 * PreviewCenter 하단 액션 도크
 * - safe area 고려 (bottom padding)
 * - 모드별 기본 액션 자동 생성
 * - 커스텀 액션 지원
 * - 잠금/해제/내보내기(PDF, CSV) 액션 지원
 */
export function PreviewActionDock({
  mode,
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
  disabled = false,
  customActions,
  showExportMenu = false,
}: PreviewActionDockProps) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  const getDefaultActions = (): DockAction[] => {
    const actions: DockAction[] = []

    if (onDownload && mode !== 'edit') {
      actions.push({
        id: 'download',
        label: '다운로드',
        icon: <Download className="h-4 w-4" />,
        onClick: onDownload,
        disabled,
      })
    }

    if (onShare && mode === 'readonly') {
      actions.push({
        id: 'share',
        label: '공유',
        icon: <Share2 className="h-4 w-4" />,
        onClick: onShare,
        disabled,
      })
    }

    if (mode === 'readonly') {
      if (status === 'locked' && onUnlock) {
        actions.push({
          id: 'unlock',
          label: '잠금해제',
          icon: <Unlock className="h-4 w-4" />,
          onClick: onUnlock,
          disabled,
        })
      } else if (status !== 'locked' && onLock) {
        actions.push({
          id: 'lock',
          label: '잠금',
          icon: <Lock className="h-4 w-4" />,
          onClick: onLock,
          disabled,
        })
      }
    }

    if (mode === 'signature' && onSign) {
      actions.push({
        id: 'sign',
        label: '사인하기',
        icon: <FileSignature className="h-4 w-4" />,
        onClick: onSign,
        primary: true,
        disabled,
      })
    }

    if (mode === 'edit' && onSave) {
      actions.push({
        id: 'save',
        label: '저장',
        icon: <Save className="h-4 w-4" />,
        onClick: onSave,
        disabled,
      })
    }

    if (onSubmit && status === 'draft') {
      actions.push({
        id: 'submit',
        label: '제출',
        icon: <Check className="h-4 w-4" />,
        onClick: onSubmit,
        primary: true,
        disabled,
      })
    }

    return actions
  }

  const actions = customActions || getDefaultActions()
  const visibleActions = actions.filter(a => !a.hidden)

  const exportMenuItems = [
    ...(onExportPdf ? [{
      id: 'export-pdf',
      label: 'PDF 내보내기',
      icon: <FileDown className="h-4 w-4" />,
      onClick: () => {
        onExportPdf()
        setExportMenuOpen(false)
      },
    }] : []),
    ...(onExportCsv ? [{
      id: 'export-csv',
      label: 'CSV 내보내기',
      icon: <Table2 className="h-4 w-4" />,
      onClick: () => {
        onExportCsv()
        setExportMenuOpen(false)
      },
    }] : []),
  ]

  const showExportDropdown = showExportMenu && exportMenuItems.length > 0

  if (visibleActions.length === 0 && !showExportDropdown) return null

  return (
    <div className="border-t border-[var(--color-divider)] bg-[var(--color-bg-surface)] px-4 py-3 pb-[calc(12px+var(--safe-bottom))]">
      <div className="flex items-center justify-center gap-3">
        {visibleActions.map(action => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title}
            className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 font-semibold transition ${
              action.primary
                ? 'bg-[var(--color-primary-strong)] text-white hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-text-muted)]'
                : 'border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-primary-strong)] hover:bg-[var(--color-bg-highlight)]'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {action.icon}
            <span className="text-sm">{action.label}</span>
          </button>
        ))}

        {showExportDropdown && (
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={disabled}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-2 font-semibold text-[var(--color-primary-strong)] hover:bg-[var(--color-bg-highlight)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              <span className="text-sm">내보내기</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setExportMenuOpen(false)}
                />
                <div className="absolute bottom-full left-1/2 z-20 mb-2 w-40 -translate-x-1/2 rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg">
                  {exportMenuItems.map(item => (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
