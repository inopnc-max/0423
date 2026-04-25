'use client'

import { Download, Share2, Check, FileSignature, Save } from 'lucide-react'

export interface DockAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  primary?: boolean
  disabled?: boolean
  hidden?: boolean
}

export interface PreviewActionDockProps {
  mode: 'readonly' | 'edit' | 'signature'
  status?: 'draft' | 'pending' | 'approved' | 'locked' | 'rejected'
  onDownload?: () => void
  onShare?: () => void
  onSave?: () => void
  onSign?: () => void
  onSubmit?: () => void
  disabled?: boolean
  customActions?: DockAction[]
}

/**
 * PreviewCenter 하단 액션 도크
 * - safe area 고려 (bottom padding)
 * - 모드별 기본 액션 자동 구성
 * - 커스텀 액션 오버라이드 가능
 */
export function PreviewActionDock({
  mode,
  status,
  onDownload,
  onShare,
  onSave,
  onSign,
  onSubmit,
  disabled = false,
  customActions,
}: PreviewActionDockProps) {
  // 기본 액션 구성
  const getDefaultActions = (): DockAction[] => {
    const actions: DockAction[] = []

    // Download: always available except edit mode with no saved data
    if (onDownload && mode !== 'edit') {
      actions.push({
        id: 'download',
        label: '다운로드',
        icon: <Download className="h-4 w-4" />,
        onClick: onDownload,
        disabled,
      })
    }

    // Share: available in readonly mode
    if (onShare && mode === 'readonly') {
      actions.push({
        id: 'share',
        label: '공유',
        icon: <Share2 className="h-4 w-4" />,
        onClick: onShare,
        disabled,
      })
    }

    // Signature mode: Sign button (primary)
    if (mode === 'signature' && onSign) {
      actions.push({
        id: 'sign',
        label: '서명하기',
        icon: <FileSignature className="h-4 w-4" />,
        onClick: onSign,
        primary: true,
        disabled,
      })
    }

    // Edit mode: Save button
    if (mode === 'edit' && onSave) {
      actions.push({
        id: 'save',
        label: '저장',
        icon: <Save className="h-4 w-4" />,
        onClick: onSave,
        disabled,
      })
    }

    // Submit: primary action when available
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

  if (visibleActions.length === 0) return null

  return (
    <div className="border-t border-[var(--color-divider)] bg-[var(--color-bg-surface)] px-4 py-3 pb-[calc(12px+var(--safe-bottom))]">
      <div className="flex items-center justify-center gap-3">
        {visibleActions.map(action => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
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
      </div>
    </div>
  )
}
