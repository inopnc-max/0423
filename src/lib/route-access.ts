/* ═══════════════════════════════════════════════════════════════════
   Route Access Control
   ═══════════════════════════════════════════════════════════════════ */

import { ROUTES } from './routes.constants'
import type { Role } from './roles'

export const ROUTE_ROLE_ACCESS: Record<string, readonly Role[]> = {
  [ROUTES.login]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.register]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.home]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.output]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.worklog]: ['worker', 'site_manager', 'admin'],
  [ROUTES.site]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.documents]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.materials]: ['worker', 'site_manager', 'admin'],
  [ROUTES.confirmSheet]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.search]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.settings]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.notifications]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.hqRequests]: ['worker', 'partner', 'site_manager', 'admin'],
  [ROUTES.admin]: ['admin'],
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
