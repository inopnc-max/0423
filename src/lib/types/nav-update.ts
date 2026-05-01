/**
 * BottomNav notice types for the nav_update_events system.
 */

/**
 * Notice types for BottomNav alerts.
 */
export type BottomNavNoticeType =
  | 'daily_log_status'      // 일지 승인/반려
  | 'confirmation_form'     // 확인서 상태 변경
  | 'photo_sheet'           // 사진대지 상태 변경
  | 'document_shared'       // 문서 공유
  | 'salary_statement'       // 급여명세서 변경
  | 'sync_failed'           // 동기화 실패
  | 'approval_required'     // 승인 요청
  | 'worklog_reminder'      // 일지 작성 알림

/**
 * A single notice item for BottomNav badge display.
 */
export interface BottomNavNotice {
  id: string
  userId: string
  noticeType: BottomNavNoticeType
  title: string
  body: string | null
  /** Route path to navigate when clicked */
  route: string | null
  /** Query params for the route */
  routeParams: Record<string, string> | null
  targetId: string | null
  targetType: string | null
  isRead: boolean
  createdAt: string
}

/**
 * Aggregated notice count for a specific type.
 */
export interface BottomNavNoticeCount {
  noticeType: BottomNavNoticeType
  count: number
  latestTitle: string
  latestCreatedAt: string
}

/**
 * Create params for a notice.
 */
export interface CreateNoticeParams {
  userId: string
  noticeType: BottomNavNoticeType
  title: string
  body?: string | null
  route?: string | null
  routeParams?: Record<string, string> | null
  targetId?: string | null
  targetType?: string | null
}

/**
 * Role-filtered notice display config.
 */
export interface NoticeRoleConfig {
  /** Roles that can see this notice type */
  visibleTo: ('worker' | 'site_manager' | 'partner' | 'admin' | 'production_manager')[]
  /** Priority level for sorting (higher = more important) */
  priority: number
  /** Icon name for the notice */
  icon?: string
}
