/* ═══════════════════════════════════════════════════════════════════
   Navigation Configuration
   vFinal 기준 역할별 BottomNav — SSOT
   ═══════════════════════════════════════════════════════════════════ */

import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  FileSignature,
  FolderOpen,
  House,
  MessageSquareMore,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  ClipboardCheck,
  Boxes,
  Wallet,
  Files,
  History,
  BarChart3,
  Truck,
  PenLine,
  List,
} from 'lucide-react'
import { ROUTES, ROUTE_LABELS } from './routes.constants'
import type { Role } from './roles'

export interface NavigationItem {
  href: string
  label: string
  icon: LucideIcon
}

/* ─── Shared route nav items ─── */

const NAV_HOME: NavigationItem = {
  href: ROUTES.home,
  label: ROUTE_LABELS[ROUTES.home],
  icon: House,
}
const NAV_OUTPUT: NavigationItem = {
  href: ROUTES.output,
  label: ROUTE_LABELS[ROUTES.output],
  icon: CalendarDays,
}
const NAV_WORKLOG: NavigationItem = {
  href: ROUTES.worklog,
  label: ROUTE_LABELS[ROUTES.worklog],
  icon: ClipboardList,
}
const NAV_SITE: NavigationItem = {
  href: ROUTES.site,
  label: ROUTE_LABELS[ROUTES.site],
  icon: Building2,
}
const NAV_DOCUMENTS: NavigationItem = {
  href: ROUTES.documents,
  label: ROUTE_LABELS[ROUTES.documents],
  icon: FolderOpen,
}
const NAV_SETTINGS: NavigationItem = {
  href: ROUTES.settings,
  label: ROUTE_LABELS[ROUTES.settings],
  icon: Settings,
}
const NAV_ALERTS: NavigationItem = {
  href: ROUTES.notifications,
  label: ROUTE_LABELS[ROUTES.notifications],
  icon: Bell,
}
const NAV_ADMIN: NavigationItem = {
  href: ROUTES.admin,
  label: ROUTE_LABELS[ROUTES.admin],
  icon: ShieldCheck,
}

/* ─── Role-specific nav items (pages may not exist yet) ─── */

// 현장관리자 승인 (/admin/worklogs) — TODO: 실제 페이지 구현 시 경로 확인
const NAV_APPROVAL: NavigationItem = {
  href: '/admin/worklogs',
  label: '승인',
  icon: ClipboardCheck,
}

// 현장관리자 작업자 (/admin/users) — TODO: 실제 페이지 구현 시 경로 확인
const NAV_WORKERS: NavigationItem = {
  href: '/admin/users',
  label: '작업자',
  icon: Users,
}

// 파트너 현장 (/site) — 기존 route 사용

// 파트너 출역 (/output) — 기존 route 사용

// 파트너 알림 (/notifications) — 기존 route 사용

// 생산관리자 입력 (/production/input) — TODO: 실제 페이지 구현 필요
const NAV_PROD_INPUT: NavigationItem = {
  href: '/production/input',
  label: '입력',
  icon: PenLine,
}

// 생산관리자 내역 (/production/logs) — TODO: 실제 페이지 구현 필요
const NAV_PROD_LOGS: NavigationItem = {
  href: '/production/logs',
  label: '내역',
  icon: List,
}

// 생산관리자 요약 (/production/summary) — TODO: 실제 페이지 구현 필요
const NAV_PROD_SUMMARY: NavigationItem = {
  href: '/production/summary',
  label: '요약',
  icon: BarChart3,
}

/* ─── Role-specific BottomNav (vFinal 기준) ─── */

export const BOTTOM_NAV_BY_ROLE: Record<Role, NavigationItem[]> = {
  worker: [
    NAV_HOME,
    NAV_OUTPUT,
    NAV_WORKLOG,
    NAV_SITE,
    NAV_DOCUMENTS,
    NAV_SETTINGS,
  ],
  site_manager: [
    NAV_HOME,
    NAV_APPROVAL,
    NAV_WORKERS,
    NAV_SITE,
    NAV_DOCUMENTS,
    NAV_SETTINGS,
  ],
  partner: [
    NAV_HOME,
    NAV_OUTPUT,
    NAV_SITE,
    NAV_DOCUMENTS,
    NAV_ALERTS,
  ],
  production_manager: [
    NAV_HOME,
    NAV_PROD_INPUT,
    NAV_PROD_LOGS,
    NAV_PROD_SUMMARY,
    NAV_SETTINGS,
  ],
  admin: [
    NAV_HOME,
    NAV_SITE,
    NAV_APPROVAL,
    NAV_DOCUMENTS,
    NAV_ADMIN,
    NAV_SETTINGS,
  ],
}

/* ─── Role-specific secondary actions (FAB) ─── */

export const SECONDARY_APP_ACTIONS: NavigationItem[] = [
  { href: ROUTES.materials, label: ROUTE_LABELS[ROUTES.materials], icon: Package },
]

export const BOTTOM_NAV_SECONDARY_BY_ROLE: Record<Role, NavigationItem[]> = {
  worker: SECONDARY_APP_ACTIONS,
  site_manager: SECONDARY_APP_ACTIONS,
  partner: [],           // partner: secondary FAB 없음
  production_manager: [], // TODO: 생산관리 secondary actions 정의 필요
  admin: SECONDARY_APP_ACTIONS,
}

/* ─── Navigation helpers ─── */

export function getBottomNavItems(role: Role): NavigationItem[] {
  return BOTTOM_NAV_BY_ROLE[role] ?? BOTTOM_NAV_BY_ROLE.worker
}

export function getSecondaryActions(role: Role): NavigationItem[] {
  return BOTTOM_NAV_SECONDARY_BY_ROLE[role] ?? []
}

/* ─── Legacy exports (하위 호환) ─── */

export const APP_NAV_ITEMS = BOTTOM_NAV_BY_ROLE.worker

export const HEADER_ACTION_ITEMS: NavigationItem[] = [
  { href: ROUTES.search, label: ROUTE_LABELS[ROUTES.search], icon: Search },
  { href: ROUTES.confirmSheet, label: ROUTE_LABELS[ROUTES.confirmSheet], icon: FileSignature },
  { href: ROUTES.hqRequests, label: ROUTE_LABELS[ROUTES.hqRequests], icon: MessageSquareMore },
  { href: ROUTES.notifications, label: ROUTE_LABELS[ROUTES.notifications], icon: Bell },
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
