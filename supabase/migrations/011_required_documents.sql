-- ============================================================
-- 필수서류, nav_update_events, document_view_events 테이블 생성
-- A-1: Supabase 마이그레이션 - 필수서류 및 알림 시스템
--
-- 주의:
--   - destructive migration 금지
--   - 기존 데이터 영향 없음 (nullable, no backfill)
-- ============================================================

-- ── document_requirements 테이블 ─────────────────────────────
-- 필수서류 정의 (현장별/직무별 필요 문서 목록)

CREATE TABLE IF NOT EXISTS document_requirements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID REFERENCES sites(id) ON DELETE SET NULL,
  role         TEXT NOT NULL DEFAULT 'worker'
    CHECK (role IN ('worker', 'site_manager', 'partner', 'admin', 'production_manager')),
  category     TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  required     BOOLEAN NOT NULL DEFAULT true,
  deadline_days INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_requirements_site_role
  ON document_requirements (site_id, role);

-- ── worker_required_documents 테이블 ────────────────────────
-- 작업자별 필수서류 상태 추적

CREATE TABLE IF NOT EXISTS worker_required_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  site_id          UUID REFERENCES sites(id) ON DELETE SET NULL,
  requirement_id   UUID NOT NULL REFERENCES document_requirements(id) ON DELETE CASCADE,
  document_id      UUID REFERENCES documents(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'expired')),
  submitted_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES workers(id),
  expiry_date      DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_required_docs_user
  ON worker_required_documents (user_id, status);

CREATE INDEX IF NOT EXISTS idx_worker_required_docs_site
  ON worker_required_documents (site_id, status);

CREATE INDEX IF NOT EXISTS idx_worker_required_docs_requirement
  ON worker_required_documents (requirement_id, status);

-- ── nav_update_events 테이블 ──────────────────────────────────
-- BottomNav 알림 이벤트

CREATE TABLE IF NOT EXISTS nav_update_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  notice_type   TEXT NOT NULL
    CHECK (notice_type IN (
      'daily_log_status',
      'confirmation_form',
      'photo_sheet',
      'document_shared',
      'salary_statement',
      'sync_failed',
      'approval_required',
      'worklog_reminder'
    )),
  title         TEXT NOT NULL,
  body          TEXT,
  route         TEXT,
  route_params  JSONB,
  target_id     TEXT,
  target_type   TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nav_update_events_user_unread
  ON nav_update_events (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nav_update_events_notice_type
  ON nav_update_events (user_id, notice_type, created_at DESC);

-- ── document_view_events 테이블 ────────────────────────────────
-- 문서 열람 이력

CREATE TABLE IF NOT EXISTS document_view_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  viewed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_view_events_document
  ON document_view_events (document_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_view_events_user
  ON document_view_events (user_id, viewed_at DESC);

-- ── Comments ───────────────────────────────────────────────

COMMENT ON TABLE document_requirements    IS '필수서류 정의 - 현장별/직무별 필요 문서 목록';
COMMENT ON TABLE worker_required_documents IS '작업자별 필수서류 상태 - 제출/승인/만료 추적';
COMMENT ON TABLE nav_update_events      IS 'BottomNav 알림 이벤트 - 알림 배지/미세배지 데이터 원천';
COMMENT ON TABLE document_view_events   IS '문서 열람 이력 - 최근 본 문서/감사 추적';
