/**
 * Document system type definitions.
 * These types define the document library API contract.
 * They are NOT database schemas — renderer/business logic uses these types.
 */

/* ─── Core Document Types ─────────────────────────────────────── */

export type DocumentStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'locked'
  | 'archived'

export type DocumentSourceType =
  | 'photo_sheet'
  | 'worklog'
  | 'confirm_sheet'
  | 'salary_statement'
  | 'issue_report'
  | 'worker_required_document'
  | 'upload'

export type DocumentCategory =
  | '일지보고서'
  | '사진대지'
  | '도면마킹'
  | '안전서류'
  | '견적서'
  | '시공계획서'
  | '장비계획서'
  | '기타서류'
  | '확인서'

/* ─── documents 테이블 Row ────────────────────────────────────── */

export interface DocumentRow {
  id: string
  site_id: string
  category: DocumentCategory | string
  title: string
  file_url: string | null
  file_type: string | null
  file_size: number | null
  uploaded_by: string
  created_at: string
  // Migration 004
  storage_bucket: string | null
  storage_path: string | null
  source_type: DocumentSourceType | string | null
  source_id: string | null
  // Migration 005
  approval_status: DocumentStatus | string | null
  approved_at: string | null
  approved_by: string | null
  locked_at: string | null
  locked_by: string | null
}

/* ─── document_versions 테이블 Row ────────────────────────────── */

export interface DocumentVersionRow {
  id: string
  document_id: string
  version_no: number
  storage_bucket: string | null
  storage_path: string | null
  file_size_bytes: number | null
  mime_type: string | null
  checksum: string | null
  created_by: string
  created_at: string
}

/* ─── document_shares 테이블 Row ────────────────────────────── */

export interface DocumentShareRow {
  id: string
  document_id: string
  share_token: string
  shared_by: string
  share_scope: 'site' | 'company' | 'public'
  share_with_role?: string
  share_with_user_id?: string
  allow_download: boolean
  expires_at: string | null
  created_at: string
  revoked_at: string | null
}

/* ─── document_audit_logs 테이블 Row ─────────────────────────── */

export type AuditAction =
  | 'view'
  | 'download'
  | 'share'
  | 'lock'
  | 'unlock'
  | 'approve'
  | 'reject'
  | 'update'
  | 'delete'

export interface DocumentAuditLogRow {
  id: string
  document_id: string
  action: AuditAction | string
  actor_id: string
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  reason: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

/* ─── nav_update_events 테이블 Row ───────────────────────────── */

export type NavNoticeType =
  | 'daily_log_status'
  | 'confirmation_form'
  | 'photo_sheet'
  | 'document_shared'
  | 'salary_statement'
  | 'sync_failed'
  | 'approval_required'
  | 'worklog_reminder'

export interface NavUpdateEventRow {
  id: string
  user_id: string
  notice_type: NavNoticeType | string
  title: string
  body: string | null
  route: string | null
  route_params: Record<string, string> | null
  target_id: string | null
  target_type: string | null
  is_read: boolean
  created_at: string
}

/* ─── document_view_events 테이블 Row ─────────────────────────── */

export interface DocumentViewEventRow {
  id: string
  document_id: string
  user_id: string
  viewed_at: string
}

/* ─── Save Document Params ───────────────────────────────────── */

export interface SaveDocumentParams {
  id?: string
  siteId: string
  category: DocumentCategory | string
  title: string
  fileUrl?: string | null
  fileType?: string | null
  fileSize?: number | null
  storageBucket?: string | null
  storagePath?: string | null
  sourceType?: DocumentSourceType | string | null
  sourceId?: string | null
  uploadedBy: string
  existingId?: string | null
}

/* ─── Save Document Version Params ───────────────────────────── */

export interface SaveDocumentVersionParams {
  documentId: string
  storageBucket?: string | null
  storagePath?: string | null
  fileSizeBytes?: number | null
  mimeType?: string | null
  checksum?: string | null
  createdBy: string
}

/* ─── Lock/Unlock Params ─────────────────────────────────────── */

export interface LockDocumentParams {
  documentId: string
  actorId: string
  reason?: string
}

export interface UnlockDocumentParams {
  documentId: string
  actorId: string
  reason?: string
}

/* ─── Share Link Params ──────────────────────────────────────── */

export interface CreateShareLinkParams {
  documentId: string
  sharedBy: string
  shareScope?: 'site' | 'company' | 'public'
  shareWithRole?: string
  shareWithUserId?: string
  allowDownload?: boolean
  expiresAt?: string | null
}

export interface UpdateShareSettingsParams {
  shareId: string
  allowDownload?: boolean
  expiresAt?: string | null
  revokedAt?: string | null
}

/* ─── Audit Log Params ───────────────────────────────────────── */

export interface LogDocumentViewParams {
  documentId: string
  userId: string
}

export interface LogDocumentActionParams {
  documentId: string
  actorId: string
  action: AuditAction
  beforeData?: Record<string, unknown> | null
  afterData?: Record<string, unknown> | null
  reason?: string | null
}
