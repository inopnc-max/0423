/* ═══════════════════════════════════════════════════════════════════
   Header Behavior & Navigation Utilities
   AppShell과 AppHeader에서 사용하는 헤더 동작 및 네비게이션 상태 헬퍼
   ═══════════════════════════════════════════════════════════════════ */

import type { LucideIcon } from 'lucide-react'
import { Bell, FileSignature, MessageSquareMore, Search } from 'lucide-react'
import { ROUTES } from './routes.constants'
import type { Role } from './roles'

/* ─── Header Behavior ─── */

export type HeaderBehaviorKind = 'default' | 'back' | 'hidden'

export interface HeaderBehavior {
  kind: HeaderBehaviorKind
  leading: 'logo' | 'back'
}

const BACK_LEADING_ROUTES = [
  ROUTES.output,
  ROUTES.worklog,
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

  if (pathname === ROUTES.home || pathname === ROUTES.admin) {
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

/* ─── Header Action ID Type ─── */

export type HeaderActionId = string

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

/* ─── Header Action Item ─── */

export interface HeaderActionItem {
  id: string
  label: string
  title: string
  icon: LucideIcon
  kind: 'action' | 'link'
  href?: string
  onSelect?: () => void
  badge?: 'notifications'
  mobilePriority?: boolean
}

/* ─── Default Header Action Items ─── */

interface GetHeaderActionItemsOptions {
  pathname: string
  role: Role | string
}

export function getHeaderActionItems(options: GetHeaderActionItemsOptions): HeaderActionItem[] {
  const items: HeaderActionItem[] = [
    {
      id: 'search',
      label: '검색',
      title: '통합검색',
      icon: Search,
      kind: 'link',
      href: ROUTES.search,
      mobilePriority: true,
    },
    {
      id: 'confirm-sheet',
      label: '확인서',
      title: '확인서',
      icon: FileSignature,
      kind: 'link',
      href: ROUTES.confirmSheet,
      mobilePriority: true,
    },
    {
      id: 'hq-requests',
      label: '본사요청',
      title: '본사요청',
      icon: MessageSquareMore,
      kind: 'link',
      href: ROUTES.hqRequests,
      mobilePriority: false,
    },
    {
      id: 'notifications',
      label: '알림',
      title: '알림',
      icon: Bell,
      kind: 'link',
      href: ROUTES.notifications,
      badge: 'notifications',
      mobilePriority: true,
    },
  ]

  if (options.role === 'production_manager') {
    return items.filter(
      item => item.href !== ROUTES.confirmSheet && item.href !== ROUTES.hqRequests
    )
  }

  return items
}
