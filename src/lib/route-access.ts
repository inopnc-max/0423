/* ═══════════════════════════════════════════════════════════════════
   Route Access Control
   vFinal 기준 — production_manager는 output/worklog/confirmSheet/hqRequests 접근 불가
   site_manager는 /admin/worklogs, /admin/users에만 접근 가능
   ═══════════════════════════════════════════════════════════════════ */

import { ROUTES } from './routes.constants'
import type { Role } from './roles'

export const ROUTE_ROLE_ACCESS: Record<string, readonly Role[]> = {
  // All roles
  [ROUTES.login]: ['worker', 'partner', 'site_manager', 'production_manager', 'admin'],
  [ROUTES.register]: ['worker', 'partner', 'site_manager', 'production_manager', 'admin'],
  [ROUTES.home]: ['worker', 'partner', 'site_manager', 'production_manager', 'admin'],
  // worker, site_manager, admin only (NOT production_manager, NOT partner)
  [ROUTES.output]: ['worker', 'site_manager', 'admin'],
  // worker, site_manager, admin only (NOT production_manager, NOT partner)
  [ROUTES.worklog]: ['worker', 'site_manager', 'admin'],
  // All roles except production_manager
  [ROUTES.site]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.documents]: ['worker', 'partner', 'site_manager', 'admin'],
  // worker, site_manager, admin only (NOT production_manager)
  [ROUTES.materials]: ['worker', 'site_manager', 'admin'],
  // worker, partner, site_manager, admin only (NOT production_manager)
  [ROUTES.confirmSheet]: ['worker', 'partner', 'site_manager', 'admin'],
  // All roles
  [ROUTES.search]: ['worker', 'partner', 'site_manager', 'production_manager', 'admin'],
  // All roles
  [ROUTES.settings]: ['worker', 'partner', 'site_manager', 'production_manager', 'admin'],
  // All roles
  [ROUTES.notifications]: ['worker', 'partner', 'site_manager', 'production_manager', 'admin'],
  // worker, partner, site_manager, admin only (NOT production_manager)
  [ROUTES.hqRequests]: ['worker', 'partner', 'site_manager', 'admin'],
  // Admin only
  [ROUTES.admin]: ['admin'],
  // Admin sub-routes — site_manager can access worklogs and users only
  '/admin/worklogs': ['site_manager', 'admin'],
  '/admin/users': ['site_manager', 'admin'],
  // Production manager sub-routes — TODO: 실제 구현 시 라우트 정의 필요
  '/production': ['production_manager'],
  '/production/input': ['production_manager'],
  '/production/logs': ['production_manager'],
  '/production/summary': ['production_manager'],
}

function findParentRoute(route: string): string | null {
  const segments = route.split('/')
  for (let index = segments.length - 1; index > 0; index -= 1) {
    const parent = segments.slice(0, index).join('/')
    if (parent) return parent
  }
  return null
}

export function canAccessRoute(route: string, role: Role | string): boolean {
  const exactAccess = ROUTE_ROLE_ACCESS[route]
  if (exactAccess?.includes(role as Role)) return true

  let current = findParentRoute(route)
  while (current) {
    const parentAccess = ROUTE_ROLE_ACCESS[current]
    if (parentAccess?.includes(role as Role)) return true
    current = findParentRoute(current)
  }

  return false
}

export function getLoginRedirectPath(_role: string): string {
  return ROUTES.home
}

export function getRoleThemeClass(role: string): string {
  const themeMap: Record<string, string> = {
    worker: 'ui-role-worker',
    partner: 'ui-role-partner',
    site_manager: 'ui-role-site-manager',
    production_manager: 'ui-role-production-manager',
    admin: 'ui-role-admin',
  }
  const normalized = role.toLowerCase().trim()
  return themeMap[normalized] ?? 'ui-role-worker'
}

export function getRouteLabel(pathname: string): string {
  if (pathname.startsWith('/site/')) return '현장 상세'
  if (pathname.startsWith('/admin')) return '관리자콘솔'

  const matchedRoute = Object.values(ROUTES).find(route => route === pathname)
  if (matchedRoute) {
    const labels: Record<string, string> = {
      [ROUTES.login]: '로그인',
      [ROUTES.register]: '파트너 가입',
      [ROUTES.home]: '홈',
      [ROUTES.output]: '출역',
      [ROUTES.worklog]: '일지',
      [ROUTES.site]: '현장',
      [ROUTES.documents]: '문서함',
      [ROUTES.materials]: '자재관리',
      [ROUTES.confirmSheet]: '확인서',
      [ROUTES.search]: '통합검색',
      [ROUTES.settings]: '설정',
      [ROUTES.notifications]: '알림',
      [ROUTES.hqRequests]: '본사요청',
      [ROUTES.admin]: '관리자콘솔',
    }
    return labels[matchedRoute] || 'INOPNC'
  }

  return 'INOPNC'
}
