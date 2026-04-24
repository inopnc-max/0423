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
  getHeaderActionItems,
  getHeaderBehavior,
  isNavigationRouteActive,
  type HeaderActionBadgeKey,
  type HeaderActionId,
  type HeaderActionItem,
  type HeaderActionKind,
  type HeaderActionVisibilityContext,
  type HeaderBehavior,
  type HeaderLeadingMode,
  type NavigationItem,
} from './navigation.config'

// Route Access Control
export {
  ROUTE_ROLE_ACCESS,
  canAccessRoute,
  getLoginRedirectPath,
  getRouteLabel,
} from './route-access'
