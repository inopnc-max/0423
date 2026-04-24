import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Files,
  FolderOpen,
  History,
  House,
  Package,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  Wallet,
} from 'lucide-react'
import { canAccessRoute } from './route-access'
import type { Role } from './roles'
import { ROUTES, ROUTE_LABELS } from './routes.constants'

export interface NavigationItem {
  href: string
  label: string
  icon: LucideIcon
}

export type HeaderActionId =
  | 'search'
  | 'confirm-sheet'
  | 'hq-requests'
  | 'notifications'

export type HeaderActionKind = 'link' | 'action'
export type HeaderActionBadgeKey = 'notifications'
export type HeaderLeadingMode = 'menu' | 'back'

export interface HeaderActionVisibilityContext {
  pathname: string
  role?: Role | string | null
}

export interface HeaderActionItem {
  id: HeaderActionId
  label: string
  title?: string
  icon: LucideIcon
  kind: HeaderActionKind
  href?: string
  badge?: HeaderActionBadgeKey
  mobilePriority: number
  visible?: (context: HeaderActionVisibilityContext) => boolean
}

export interface HeaderBehavior {
  leading: HeaderLeadingMode
  fallbackHref?: string
}

const canShowLinkedAction = (
  context: HeaderActionVisibilityContext,
  href?: string
) => Boolean(href && context.role && canAccessRoute(href, context.role))

export const APP_NAV_ITEMS: NavigationItem[] = [
  { href: ROUTES.home, label: ROUTE_LABELS[ROUTES.home], icon: House },
  { href: ROUTES.output, label: ROUTE_LABELS[ROUTES.output], icon: CalendarDays },
  { href: ROUTES.worklog, label: ROUTE_LABELS[ROUTES.worklog], icon: ClipboardList },
  { href: ROUTES.site, label: ROUTE_LABELS[ROUTES.site], icon: Building2 },
  { href: ROUTES.documents, label: ROUTE_LABELS[ROUTES.documents], icon: FolderOpen },
  { href: ROUTES.settings, label: ROUTE_LABELS[ROUTES.settings], icon: Settings },
]

export const HEADER_ACTION_ITEMS: HeaderActionItem[] = []

export const SECONDARY_APP_ACTIONS: NavigationItem[] = [
  { href: ROUTES.materials, label: ROUTE_LABELS[ROUTES.materials], icon: Package },
]

export const ADMIN_ROUTES = {
  dashboard: ROUTES.admin,
  users: '/admin/users',
  sites: '/admin/sites',
  worklogs: '/admin/worklogs',
  materials: '/admin/materials',
  payroll: '/admin/payroll',
  documents: '/admin/documents',
  notifications: '/admin/notifications',
  audit: '/admin/audit',
  csvUpload: '/admin/csv-upload',
} as const

export const ADMIN_NAV_ITEMS: NavigationItem[] = [
  { href: ADMIN_ROUTES.dashboard, label: '대시보드', icon: ShieldCheck },
  { href: ADMIN_ROUTES.users, label: '사용자/권한', icon: Users },
  { href: ADMIN_ROUTES.sites, label: '회사/현장', icon: Building2 },
  { href: ADMIN_ROUTES.worklogs, label: '일지 승인', icon: ClipboardCheck },
  { href: ADMIN_ROUTES.materials, label: '자재/영수증', icon: Boxes },
  { href: ADMIN_ROUTES.payroll, label: '출역/급여', icon: Wallet },
  { href: ADMIN_ROUTES.documents, label: '문서/안전서류', icon: Files },
  { href: ADMIN_ROUTES.notifications, label: '알림 발송', icon: Bell },
  { href: ADMIN_ROUTES.audit, label: '감사로그', icon: History },
  { href: ADMIN_ROUTES.csvUpload, label: 'CSV 업로드', icon: Upload },
]

export function getHeaderActionItems(
  context: HeaderActionVisibilityContext
): HeaderActionItem[] {
  return HEADER_ACTION_ITEMS.filter(item => item.visible?.(context) ?? true)
}

export function getHeaderBehavior(pathname: string): HeaderBehavior {
  if (pathname.startsWith(`${ROUTES.site}/`)) {
    return {
      leading: 'back',
      fallbackHref: ROUTES.site,
    }
  }

  return {
    leading: 'menu',
  }
}

export function isNavigationRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
