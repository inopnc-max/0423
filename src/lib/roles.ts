// ═══════════════════════════════════════════════════════════════════
// INOPNC 역할 체계 (단일 진실의 원천 - SSOT)
// 이 파일은 프로젝트에서 단 하나만 존재합니다.
// 역할 변경 시 이 파일만 수정하세요.
// ═══════════════════════════════════════════════════════════════════

export type Role = 'worker' | 'partner' | 'site_manager' | 'production_manager' | 'admin'

export const ROLE_ALIAS_MAP: Record<string, Role> = {
  // Legacy aliases
  customer_manager: 'partner',
  customer: 'partner',
  supervisor: 'site_manager',
  manager: 'admin',
  // Standard roles
  admin: 'admin',
  worker: 'worker',
  partner: 'partner',
  site_manager: 'site_manager',
  production_manager: 'production_manager',
  prod_manager: 'production_manager',
  // Common typos / case variations
  admin_: 'admin',
  worker_: 'worker',
  partner_: 'partner',
  site_manager_: 'site_manager',
  production_manager_: 'production_manager',
  SiteManager: 'site_manager',
  Site_Manager: 'site_manager',
  ProductionManager: 'production_manager',
  Production_Manager: 'production_manager',
  Admin: 'admin',
  Worker: 'worker',
  Partner: 'partner',
}

export function normalizeRole(rawRole: string): Role {
  const normalized = rawRole.toLowerCase().trim()
  return ROLE_ALIAS_MAP[normalized] ?? (normalized as Role)
}

export const ROLE_LABELS: Record<Role, string> = {
  worker: '작업자',
  partner: '파트너',
  site_manager: '현장관리자',
  production_manager: '생산관리자',
  admin: '본사관리자',
} as const

export function isAdmin(role: string | Role): boolean {
  return role === 'admin'
}

export function isPartner(role: string | Role): boolean {
  return role === 'partner'
}

export function isSiteManager(role: string | Role): boolean {
  return role === 'site_manager'
}

export function isProductionManager(role: string | Role): boolean {
  return role === 'production_manager'
}

export function isWorker(role: string | Role): boolean {
  return role === 'worker'
}

export function hideSalary(role: string | Role): boolean {
  return role === 'partner'
}

export function hideManDay(role: string | Role): boolean {
  return role === 'partner'
}

export function hideWorkerArray(role: string | Role): boolean {
  return role === 'partner'
}
