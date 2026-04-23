/* ═══════════════════════════════════════════════════════════════════
   Navigation Configuration
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
} from 'lucide-react'
import { ROUTES, ROUTE_LABELS } from './routes.constants'

export interface NavigationItem {
  href: string
  label: string
  icon: LucideIcon
}

export const APP_NAV_ITEMS: NavigationItem[] = [
  { href: ROUTES.home, label: ROUTE_LABELS[ROUTES.home], icon: House },
  { href: ROUTES.output, label: ROUTE_LABELS[ROUTES.output], icon: CalendarDays },
  { href: ROUTES.worklog, label: ROUTE_LABELS[ROUTES.worklog], icon: ClipboardList },
  { href: ROUTES.site, label: ROUTE_LABELS[ROUTES.site], icon: Building2 },
  { href: ROUTES.documents, label: ROUTE_LABELS[ROUTES.documents], icon: FolderOpen },
  { href: ROUTES.settings, label: ROUTE_LABELS[ROUTES.settings], icon: Settings },
]

export const HEADER_ACTION_ITEMS: NavigationItem[] = [
  { href: ROUTES.search, label: ROUTE_LABELS[ROUTES.search], icon: Search },
  { href: ROUTES.confirmSheet, label: ROUTE_LABELS[ROUTES.confirmSheet], icon: FileSignature },
  { href: ROUTES.hqRequests, label: ROUTE_LABELS[ROUTES.hqRequests], icon: MessageSquareMore },
  { href: ROUTES.notifications, label: ROUTE_LABELS[ROUTES.notifications], icon: Bell },
]

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
