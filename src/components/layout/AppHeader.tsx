'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Menu, MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface AppHeaderAction {
  id: string
  label: string
  title?: string
  icon: LucideIcon
  kind: 'link' | 'action'
  href?: string
  onSelect?: () => void
  active?: boolean
  badgeContent?: number | string | null
  mobilePriority?: number
}

export interface AppHeaderStatus {
  label: string
  title?: string
  icon: LucideIcon
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  spinning?: boolean
  onClick?: () => void
}

export type AppHeaderLeading =
  | {
      kind: 'brand'
      label?: string
    }
  | {
      kind: 'logo'
      src: string
      alt?: string
      href?: string
    }
  | {
      kind: 'menu'
      label: string
      title?: string
      onClick?: () => void
    }
  | {
      kind: 'back'
      label: string
      title?: string
      onClick: () => void
    }
  | {
      kind: 'empty'
    }

interface AppHeaderProps {
  title: string
  subtitle?: string
  leading?: AppHeaderLeading
  actions: AppHeaderAction[]
  shareAction?: AppHeaderAction
  utilityActions?: AppHeaderAction[]
  status?: AppHeaderStatus
}

function getActionA11yLabel(action: AppHeaderAction) {
  if (action.badgeContent === null || action.badgeContent === undefined) {
    return action.label
  }

  return `${action.label}, ${action.badgeContent}`
}

function splitPrimaryActions(
  actions: AppHeaderAction[],
  maxInlineActions: number
): {
  inlineActions: AppHeaderAction[]
  overflowActions: AppHeaderAction[]
} {
  if (actions.length <= maxInlineActions) {
    return {
      inlineActions: actions,
      overflowActions: [],
    }
  }

  const overflowIds = new Set(
    [...actions]
      .sort((left, right) => (left.mobilePriority ?? 0) - (right.mobilePriority ?? 0))
      .slice(0, actions.length - maxInlineActions)
      .map(action => action.id)
  )

  return {
    inlineActions: actions.filter(action => !overflowIds.has(action.id)),
    overflowActions: actions.filter(action => overflowIds.has(action.id)),
  }
}

function HeaderIconAction({
  action,
  onNavigate,
}: {
  action: AppHeaderAction
  onNavigate?: () => void
}) {
  const Icon = action.icon
  const className = `ui-header-icon${action.active ? ' is-active' : ''}`
  const commonProps = {
    'aria-label': getActionA11yLabel(action),
    title: action.title ?? action.label,
    className,
  }

  if (action.kind === 'link' && action.href) {
    return (
      <Link
        {...commonProps}
        href={action.href}
        aria-current={action.active ? 'page' : undefined}
        onClick={onNavigate}
      >
        <Icon />
        {action.badgeContent ? (
          <span className="ui-noti-badge">
            {action.badgeContent}
          </span>
        ) : null}
      </Link>
    )
  }

  return (
    <button
      {...commonProps}
      type="button"
      onClick={action.onSelect}
      disabled={!action.onSelect}
      aria-pressed={action.active || undefined}
    >
      <Icon />
      {action.badgeContent ? (
        <span className="ui-noti-badge">
          {action.badgeContent}
        </span>
      ) : null}
    </button>
  )
}

function HeaderMenuItem({
  action,
  onNavigate,
}: {
  action: AppHeaderAction
  onNavigate: () => void
}) {
  const Icon = action.icon
  const className = `ui-header-overflow__item${action.active ? ' is-active' : ''}`

  if (action.kind === 'link' && action.href) {
    return (
      <Link
        href={action.href}
        className={className}
        role="menuitem"
        aria-current={action.active ? 'page' : undefined}
        onClick={onNavigate}
      >
        <span className="ui-header-overflow__icon">
          <Icon />
        </span>
        <span className="ui-header-overflow__label">{action.label}</span>
        {action.badgeContent ? (
          <span className="ui-header-overflow__badge">{action.badgeContent}</span>
        ) : null}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={className}
      role="menuitem"
      onClick={() => {
        action.onSelect?.()
        onNavigate()
      }}
      disabled={!action.onSelect}
    >
      <span className="ui-header-overflow__icon">
        <Icon />
      </span>
      <span className="ui-header-overflow__label">{action.label}</span>
      {action.badgeContent ? (
        <span className="ui-header-overflow__badge">{action.badgeContent}</span>
      ) : null}
    </button>
  )
}

function HeaderLeadingSlot({ leading }: { leading: AppHeaderLeading }) {
  if (leading.kind === 'back') {
    return (
      <button
        type="button"
        className="ui-header-icon ui-header-icon--back"
        aria-label={leading.label}
        title={leading.title ?? leading.label}
        onClick={leading.onClick}
      >
        <ChevronLeft />
      </button>
    )
  }

  if (leading.kind === 'menu' && leading.onClick) {
    return (
      <button
        type="button"
        className="ui-header-icon"
        aria-label={leading.label}
        title={leading.title ?? leading.label}
        onClick={leading.onClick}
      >
        <Menu />
      </button>
    )
  }

  if (leading.kind === 'logo') {
    const content = (
      <img
        src={leading.src}
        alt={leading.alt ?? '로고'}
        className="ui-header__logo"
      />
    )

    if (leading.href) {
      return (
        <Link href={leading.href} className="ui-header-logo-link" aria-label="홈으로 이동">
          {content}
        </Link>
      )
    }

    return content
  }

  if (leading.kind === 'brand') {
    return <span className="ui-header__brand">{leading.label || 'INOPNC'}</span>
  }

  return <span className="ui-header__brand-spacer" aria-hidden="true" />
}

function HeaderStatusChip({ status }: { status: AppHeaderStatus }) {
  const Icon = status.icon
  const className = `ui-sync-chip is-${status.tone ?? 'neutral'}`

  if (status.onClick) {
    return (
      <button
        type="button"
        className={className}
        title={status.title ?? status.label}
        aria-label={status.title ?? status.label}
        onClick={status.onClick}
      >
        <span className="ui-sync-chip__icon">
          <Icon className={status.spinning ? 'animate-spin' : undefined} />
        </span>
        <span className="ui-sync-chip__label">{status.label}</span>
      </button>
    )
  }

  return (
    <div
      className={className}
      title={status.title ?? status.label}
      aria-label={status.title ?? status.label}
    >
      <span className="ui-sync-chip__icon">
        <Icon className={status.spinning ? 'animate-spin' : undefined} />
      </span>
      <span className="ui-sync-chip__label">{status.label}</span>
    </div>
  )
}

export default function AppHeader({
  title,
  subtitle,
  leading = { kind: 'brand', label: 'INOPNC' },
  actions,
  shareAction,
  utilityActions = [],
  status,
}: AppHeaderProps) {
  const [overflowOpen, setOverflowOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement | null>(null)
  const primaryActions = shareAction ? [...actions, shareAction] : actions
  const { inlineActions, overflowActions } = splitPrimaryActions(primaryActions, 4)
  const hasOverflowMenu = overflowActions.length > 0 || utilityActions.length > 0

  useEffect(() => {
    if (!overflowOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!overflowRef.current?.contains(event.target as Node)) {
        setOverflowOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOverflowOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [overflowOpen])

  return (
    <header className="ui-header">
      <div className="ui-header__left">
        <HeaderLeadingSlot leading={leading} />
      </div>

      <div className="ui-header__title-group">
        <div className="ui-header__title" title={title}>
          {title}
        </div>
        {subtitle ? (
          <div className="ui-header__sub" title={subtitle}>
            {subtitle}
          </div>
        ) : null}
      </div>

      <div className="ui-header__right">
        {status ? <HeaderStatusChip status={status} /> : null}

        {inlineActions.map(action => (
          <HeaderIconAction key={action.id} action={action} />
        ))}

        {hasOverflowMenu ? (
          <div className="ui-header-overflow" ref={overflowRef}>
            <button
              type="button"
              className={`ui-header-icon${overflowOpen ? ' is-active' : ''}`}
              aria-label="추가 메뉴"
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              title="추가 메뉴"
              onClick={() => setOverflowOpen(previous => !previous)}
            >
              <MoreHorizontal />
            </button>

            {overflowOpen ? (
              <div className="ui-header-overflow__panel" role="menu">
                {overflowActions.map(action => (
                  <HeaderMenuItem
                    key={action.id}
                    action={action}
                    onNavigate={() => setOverflowOpen(false)}
                  />
                ))}

                {overflowActions.length > 0 && utilityActions.length > 0 ? (
                  <div className="ui-header-overflow__divider" aria-hidden="true" />
                ) : null}

                {utilityActions.map(action => (
                  <HeaderMenuItem
                    key={action.id}
                    action={action}
                    onNavigate={() => setOverflowOpen(false)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
