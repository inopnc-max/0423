-- ============================================================
-- salary_statements 테이블 생성
-- A-1: Supabase 마이그레이션 - 급여명세서 시스템
--
-- 주의:
--   - destructive migration 금지
-- ============================================================

-- ── salary_statements 테이블 ────────────────────────────────────

CREATE TABLE IF NOT EXISTS salary_statements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID REFERENCES sites(id) ON DELETE SET NULL,
  user_id          UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  work_month       TEXT NOT NULL,
  title            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'calculated', 'confirmed', 'paid', 'archived')),
  mode             TEXT NOT NULL DEFAULT 'monthly_attendance_capture'
    CHECK (mode IN ('monthly_attendance_capture', 'pay_stub_template')),
  payload          JSONB NOT NULL DEFAULT '{}',
  snapshot         JSONB,
  total_mandays    NUMERIC(5,1) DEFAULT 0,
  total_pay        INTEGER DEFAULT 0,
  document_id      UUID REFERENCES documents(id) ON DELETE SET NULL,
  confirmed_at     TIMESTAMPTZ,
  confirmed_by     UUID REFERENCES workers(id),
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_statements_user_month
  ON salary_statements (user_id, work_month DESC);

CREATE INDEX IF NOT EXISTS idx_salary_statements_site_month
  ON salary_statements (site_id, work_month DESC);

CREATE INDEX IF NOT EXISTS idx_salary_statements_status
  ON salary_statements (status, work_month DESC);

-- ── salary_entries 테이블 ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS salary_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id        UUID NOT NULL REFERENCES salary_statements(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,
  value               TEXT NOT NULL,
  entry_type          TEXT NOT NULL
    CHECK (entry_type IN ('attendance', 'allowance', 'deduction', 'payment', 'summary')),
  sort_order         INTEGER DEFAULT 0,
  is_bold             BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_entries_statement
  ON salary_entries (statement_id, sort_order);

COMMENT ON TABLE salary_statements IS '급여명세서 - 공수달력/급여명세서.mode별 급여 데이터';
COMMENT ON TABLE salary_entries    IS '급여명세서 항목 - 급여명세서 내 각 라인 항목';
