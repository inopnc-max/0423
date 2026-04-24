/* ═══════════════════════════════════════════════════════════════════
   Route Constants
   ═══════════════════════════════════════════════════════════════════ */

export const ROUTES = {
  login: '/login',
  register: '/register',
  home: '/home',
  output: '/output',
  worklog: '/worklog',
  site: '/site',
  documents: '/documents',
  materials: '/materials',
  confirmSheet: '/confirm-sheet',
  search: '/search',
  settings: '/settings',
  notifications: '/notifications',
  hqRequests: '/hq-requests',
  admin: '/admin',
  production: '/production',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export const ROUTE_LABELS: Record<AppRoute, string> = {
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
  [ROUTES.production]: '생산관리',
}
