-- ============================================================
-- audit_logs 테이블 생성 (범용 감사 로그)
-- A-1: Supabase 마이그레이션 - 범용 감사 로그
--
-- 주의:
--   - destructive migration 금지
-- ============================================================

-- ── audit_logs 테이블 ────────────────────────────────────────────
-- 범용 감사 로그 - 모든 주요 테이블의 조작 이력 기록

CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES workers(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   UUID,
  before_data JSONB,
  after_data  JSONB,
  reason      TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target
  ON audit_logs (target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON audit_logs (created_at DESC);

COMMENT ON TABLE audit_logs IS '범용 감사 로그 - 주요 테이블의 모든 조작 이력 (INSERT/UPDATE/DELETE)';
