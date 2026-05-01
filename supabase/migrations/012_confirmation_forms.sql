-- ============================================================
-- confirmation_forms 테이블 생성
-- A-1: Supabase 마이그레이션 - 확인서 시스템
--
-- 주의:
--   - destructive migration 금지
-- ============================================================

-- ── confirmation_forms 테이블 ──────────────────────────────────

CREATE TABLE IF NOT EXISTS confirmation_forms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         UUID REFERENCES sites(id) ON DELETE SET NULL,
  user_id         UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  form_type       TEXT NOT NULL DEFAULT 'confirmation'
    CHECK (form_type IN ('confirmation', 'work_confirmation', 'custom')),
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'saved', 'shared', 'locked', 'archived')),
  input_data      JSONB NOT NULL DEFAULT '{}',
  document_id     UUID REFERENCES documents(id) ON DELETE SET NULL,
  locked_at       TIMESTAMPTZ,
  locked_by       UUID REFERENCES workers(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_confirmation_forms_user
  ON confirmation_forms (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_confirmation_forms_site
  ON confirmation_forms (site_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_confirmation_forms_status
  ON confirmation_forms (status, created_at DESC);

-- ── confirmation_form_snapshots 테이블 (선택적) ───────────────
-- 확인서 PDF 스냅샷 히스토리

CREATE TABLE IF NOT EXISTS confirmation_form_snapshots (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_form_id   UUID NOT NULL REFERENCES confirmation_forms(id) ON DELETE CASCADE,
  version_no             INTEGER NOT NULL,
  input_data_snapshot    JSONB NOT NULL,
  pdf_storage_bucket    TEXT,
  pdf_storage_path      TEXT,
  file_size_bytes       INTEGER,
  checksum              TEXT,
  generated_by          UUID NOT NULL REFERENCES workers(id),
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (confirmation_form_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_confirmation_form_snapshots_form
  ON confirmation_form_snapshots (confirmation_form_id, version_no DESC);

COMMENT ON TABLE confirmation_forms          IS '확인서 입력 데이터 - PDF 저장/공유를 위한 입력 정보';
COMMENT ON TABLE confirmation_form_snapshots IS '확인서 PDF 스냅샷 히스토리 - 버전별 PDF 파일 추적';
