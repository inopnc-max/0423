'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'
import { ChevronLeft } from 'lucide-react'
import type { Role } from '@/lib/roles'
import { ROUTES } from '@/lib/routes'

/* ─── Types ─── */

export interface AppHeaderLeadingBack {
  kind: 'back'
  label: string
  title: string
  onClick: () => void
}

export interface AppHeaderLeadingLogo {
  kind: 'logo'
  src: string
  alt: string
  href: string
}

export type AppHeaderLeading = AppHeaderLeadingBack | AppHeaderLeadingLogo

export interface AppHeaderAction {
  id: string
  label: string
  title: string
  icon: LucideIcon
  kind: 'action' | 'link'
  href?: string
  onSelect?: () => void
  active?: boolean
  badgeContent?: React.ReactNode
  mobilePriority?: boolean
}

export type HeaderActionId = string

/* ─── Header Behavior Logic ─── */

export type HeaderBehaviorKind = 'default' | 'back' | 'hidden'

export interface HeaderBehavior {
  kind: HeaderBehaviorKind
  leading: 'logo' | 'back'
}

const BACK_LEADING_ROUTES = [
  ROUTES.site,
  ROUTES.settings,
  ROUTES.notifications,
  ROUTES.hqRequests,
  ROUTES.confirmSheet,
  ROUTES.documents,
  ROUTES.materials,
  ROUTES.search,
]

export function getHeaderBehavior(pathname: string): HeaderBehavior {
  if (!pathname || pathname === '/') {
    return { kind: 'hidden', leading: 'logo' }
  }

  if (
    pathname === ROUTES.home ||
    pathname === ROUTES.output ||
    pathname === ROUTES.worklog ||
    pathname === ROUTES.admin
  ) {
    return { kind: 'default', leading: 'logo' }
  }

  for (const route of BACK_LEADING_ROUTES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return { kind: 'back', leading: 'back' }
    }
  }

  return { kind: 'default', leading: 'logo' }
}

/* ─── Navigation Active State ─── */

export function isNavigationRouteActive(pathname: string, href: string): boolean {
  if (href === ROUTES.home) {
    return pathname === ROUTES.home
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

/* ─── Default Header Action Items ─── */

interface GetHeaderActionItemsOptions {
  pathname: string
  role: Role | string
}

export function getHeaderActionItems(_options: GetHeaderActionItemsOptions): HeaderActionItemDescriptor[] {
  return [
    {
      id: 'search',
      label: '검색',
      title: '통합검색',
      iconName: 'Search',
      kind: 'link',
      href: ROUTES.search,
      mobilePriority: true,
    },
    {
      id: 'confirm-sheet',
      label: '확인서',
      title: '확인서',
      iconName: 'FileSignature',
      kind: 'link',
      href: ROUTES.confirmSheet,
      mobilePriority: true,
    },
    {
      id: 'hq-requests',
      label: '본사요청',
      title: '본사요청',
      iconName: 'MessageSquareMore',
      kind: 'link',
      href: ROUTES.hqRequests,
      mobilePriority: false,
    },
    {
      id: 'notifications',
      label: '알림',
      title: '알림',
      iconName: 'Bell',
      kind: 'link',
      href: ROUTES.notifications,
      badge: 'notifications',
      mobilePriority: true,
    },
  ]
}

export interface HeaderActionItemDescriptor {
  id: string
  label: string
  title: string
  iconName: string
  kind: 'action' | 'link'
  href?: string
  onSelect?: () => void
  badge?: 'notifications'
  mobilePriority?: boolean
}

/* ─── Component ─── */

interface AppHeaderProps {
  title?: string
  leading?: AppHeaderLeading
  actions?: AppHeaderAction[]
  utilityActions?: AppHeaderAction[]
}

export default function AppHeader({
  title,
  leading,
  actions = [],
  utilityActions = [],
}: AppHeaderProps) {
  const allActions = [...actions, ...utilityActions]

  return (
    <header
      className="sticky top-0 z-50 flex h-[var(--header-height,56px)] items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4"
      style={{ maxWidth: '960px', margin: '0 auto' }}
    >
      {/* Leading Section */}
      <div className="flex min-w-0 flex-shrink-0 items-center">
        {leading?.kind === 'back' && (
          <button
            type="button"
            onClick={leading.onClick}
            title={leading.title}
            aria-label={leading.label}
            className="flex items-center gap-1 rounded-lg px-1 py-1 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.9} />
          </button>
        )}

        {leading?.kind === 'logo' && (
          <Link
            href={leading.href}
            title={leading.alt}
            className="flex items-center"
          >
            <Image
              src={leading.src}
              alt={leading.alt}
              width={96}
              height={28}
              className="h-7 w-auto object-contain"
              priority={false}
            />
          </Link>
        )}
      </div>

      {/* Title */}
      {title ? (
        <h1 className="ml-3 truncate text-base font-semibold text-[var(--color-text)]">
          {title}
        </h1>
      ) : null}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      {allActions.length > 0 && (
        <div className="flex items-center gap-1">
          {allActions.map(action => {
            const Icon = action.icon

            const buttonContent = (
              <>
                <Icon
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.9}
                />
                {action.badgeContent != null && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold leading-none text-white">
                    {action.badgeContent}
                  </span>
                )}
              </>
            )

            const buttonClass = 'relative flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'

            if (action.kind === 'link' && action.href) {
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  title={action.title}
                  aria-label={action.label}
                  className={buttonClass}
                >
                  {buttonContent}
                </Link>
              )
            }

            return (
              <button
                key={action.id}
                type="button"
                title={action.title}
                aria-label={action.label}
                onClick={action.onSelect}
                className={buttonClass}
              >
                {buttonContent}
              </button>
            )
          })}
        </div>
      )}
    </header>
  )
}
