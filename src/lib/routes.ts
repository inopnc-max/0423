/* ═══════════════════════════════════════════════════════════════════
   Routes Barrel Export
   분리된 route 모듈들을 통합하여 re-export
   ═══════════════════════════════════════════════════════════════════ */

// Constants
export { ROUTES, ROUTE_LABELS, type AppRoute } from './routes.constants'

// Navigation Configuration
export {
  APP_NAV_ITEMS,
  HEADER_ACTION_ITEMS,
  SECONDARY_APP_ACTIONS,
  ADMIN_NAV_ITEMS,
  ADMIN_ROUTES,
  BOTTOM_NAV_BY_ROLE,
  BOTTOM_NAV_SECONDARY_BY_ROLE,
  getBottomNavItems,
  getSecondaryActions,
  type NavigationItem,
} from './navigation.config'

// Header helpers
export {
  getHeaderActionItems,
  getHeaderBehavior,
  isNavigationRouteActive,
  type HeaderBehavior,
  type HeaderBehaviorKind,
  type HeaderActionItem,
  type HeaderActionId,
} from './routes-utils'

// Route Access Control
export {
  ROUTE_ROLE_ACCESS,
  canAccessRoute,
  getLoginRedirectPath,
  getRouteLabel,
  getRoleThemeClass,
} from './route-access'
