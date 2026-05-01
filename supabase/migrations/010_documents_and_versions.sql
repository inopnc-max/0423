-- ============================================================
-- documents 테이블 확장 및 document_versions/document_shares/document_audit_logs 테이블 생성
-- A-1: Supabase 마이그레이션 - 문서 시스템 확장
--
-- 추가 컬럼:
--   - version_no: 버전 번호
--   - locked_at: 잠금 일시
--   - locked_by: 잠금자 ID
--   - shared_at: 공유 일시
--   - expires_at: 공유 만료 일시
--   - storage_path: Storage 경로
--   - thumb_path: 썸네일 경로
--   - preview_path: 미리보기 경로
--   - file_size_bytes: 파일 크기
--   - mime_type: MIME 타입
--   - checksum: SHA-256 체크섬
--
-- 새 테이블:
--   - document_versions: 문서 버전 히스토리
--   - document_shares: 문서 공유 링크
--   - document_audit_logs: 문서 감사 로그
--
-- 주의:
--   - destructive migration 금지 (drop column 대신 alter만 사용)
--   - 기존 데이터 영향 없음 (nullable, no backfill)
-- ============================================================

-- ── documents 테이블 확장 ─────────────────────────────────────

-- version_no: 문서 버전 번호
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_no INTEGER DEFAULT 1;

-- shared_at: 공유 일시
ALTER TABLE documents ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- expires_at: 공유 만료 일시
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ── Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_documents_version
  ON documents (version_no DESC);

CREATE INDEX IF NOT EXISTS idx_documents_shared
  ON documents (shared_at DESC)
  WHERE shared_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_expires
  ON documents (expires_at DESC)
  WHERE expires_at IS NOT NULL;

-- ── document_versions 테이블 ─────────────────────────────────

CREATE TABLE IF NOT EXISTS document_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_no        INTEGER NOT NULL,
  storage_bucket    TEXT,
  storage_path      TEXT,
  file_size_bytes  INTEGER,
  mime_type         TEXT,
  checksum          TEXT,
  created_by        UUID NOT NULL REFERENCES workers(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document
  ON document_versions (document_id, version_no DESC);

-- ── document_shares 테이블 ────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_shares (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  share_token       TEXT NOT NULL UNIQUE,
  shared_by         UUID NOT NULL REFERENCES workers(id),
  share_scope       TEXT NOT NULL DEFAULT 'site'
    CHECK (share_scope IN ('site', 'company', 'public')),
  share_with_role   TEXT,
  share_with_user_id UUID,
  allow_download    BOOLEAN NOT NULL DEFAULT false,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_document_shares_token
  ON document_shares (share_token);

CREATE INDEX IF NOT EXISTS idx_document_shares_document
  ON document_shares (document_id, revoked_at NULLS FIRST);

CREATE INDEX IF NOT EXISTS idx_document_shares_expires
  ON document_shares (expires_at)
  WHERE revoked_at IS NULL;

-- ── document_audit_logs 테이블 ────────────────────────────────

CREATE TABLE IF NOT EXISTS document_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  action          TEXT NOT NULL
    CHECK (action IN ('view','download','share','lock','unlock','approve','reject','update','delete')),
  actor_id        UUID NOT NULL REFERENCES workers(id),
  before_data     JSONB,
  after_data      JSONB,
  reason          TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_audit_logs_document
  ON document_audit_logs (document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_audit_logs_actor
  ON document_audit_logs (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_audit_logs_action
  ON document_audit_logs (action, created_at DESC);

-- ── Comments ───────────────────────────────────────────────

COMMENT ON COLUMN documents.version_no     IS '문서 버전 번호 (기본값 1, 저장 시 증가)';
COMMENT ON COLUMN documents.shared_at     IS '문서 공유 일시';
COMMENT ON COLUMN documents.expires_at   IS '문서 공유 만료 일시';

COMMENT ON TABLE document_versions       IS '문서 버전 히스토리 - 각 저장 시점의 파일 정보를 기록';
COMMENT ON TABLE document_shares         IS '문서 공유 링크 - 토큰 기반 공유 정보 관리';
COMMENT ON TABLE document_audit_logs     IS '문서 감사 로그 - view/download/share/lock 등 모든 조작 이력';
