-- ============================================================
-- INOPNC DB 마이그레이션 (가이드북 Phase A)
-- workers.auth.users 연동 + RLS + 역할 정규화
-- 실행: Supabase SQL Editor에서 이 파일 실행
-- ============================================================

-- ── Helper: gen_random_uuid() 사용 가능 확인 ──
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── companies 테이블 (회사/소속사) ──
CREATE TABLE IF NOT EXISTS companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  type       TEXT NOT NULL DEFAULT 'partner' CHECK (type IN ('partner', 'client')),
  business_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── workers 테이블 (역할 정규화의 출발점) ──
CREATE TABLE IF NOT EXISTS workers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  company     TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL CHECK (role IN ('worker','partner','site_manager','admin')),
  phone       TEXT,
  daily       INTEGER NOT NULL DEFAULT 150000,
  site_ids    UUID[] NOT NULL DEFAULT '{}',
  affiliation TEXT,
  title       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN workers.company IS '소속 회사명';
COMMENT ON COLUMN workers.site_ids IS 'site_manager에게 Admin이 할당한 현장 UUID 목록';
COMMENT ON COLUMN workers.affiliation IS '소속 — 파트너 가입 시 필수 입력';
COMMENT ON COLUMN workers.title IS '직함 — 파트너 가입 시 필수 입력';

-- ── sites 테이블 ──
CREATE TABLE IF NOT EXISTS sites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  company               TEXT NOT NULL DEFAULT '',
  affiliation           TEXT NOT NULL DEFAULT '',
  allowed_companies     TEXT[] NOT NULL DEFAULT '{}',
  address               TEXT NOT NULL DEFAULT '',
  accommodation_address TEXT,
  manager               TEXT NOT NULL DEFAULT '',
  manager_phone         TEXT,
  safety_manager        TEXT,
  safety_phone          TEXT,
  lat                   DOUBLE PRECISION,
  lon                   DOUBLE PRECISION,
  status                TEXT NOT NULL DEFAULT '진행',
  created_by            UUID REFERENCES workers(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN sites.allowed_companies IS '접근 허용 Partner 회사 목록';

-- ── daily_logs 테이블 ──
CREATE TABLE IF NOT EXISTS daily_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  work_date        DATE NOT NULL,
  user_id          UUID NOT NULL REFERENCES workers(id),
  site_info        JSONB NOT NULL DEFAULT '{}',
  worker_array     JSONB NOT NULL DEFAULT '[]',
  task_tags         JSONB NOT NULL DEFAULT '[]',
  material_items   JSONB NOT NULL DEFAULT '[]',
  media_info       JSONB NOT NULL DEFAULT '{}',
  issues           JSONB NOT NULL DEFAULT '[]',
  status           TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','approved','rejected')),
  rejection_reason TEXT,
  rejected_at      TIMESTAMPTZ,
  rejected_by      UUID REFERENCES workers(id),
  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES workers(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_site_date ON daily_logs(site_id, work_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_status ON daily_logs(status);

-- ── photos 테이블 ──
CREATE TABLE IF NOT EXISTS photos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  work_date        DATE NOT NULL,
  thumbnail_url    TEXT NOT NULL,
  preview_url      TEXT NOT NULL,
  archive_key     TEXT,
  original_size    BIGINT,
  compressed_size  BIGINT,
  upload_mode     TEXT NOT NULL DEFAULT 'economy',
  location_tag    TEXT,
  uploaded_by     UUID NOT NULL REFERENCES workers(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_site_date ON photos(site_id, work_date);

-- ── drawings 테이블 ──
CREATE TABLE IF NOT EXISTS drawings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  work_date      DATE NOT NULL,
  uploaded_by    UUID NOT NULL REFERENCES workers(id),
  original_path  TEXT NOT NULL,
  marked_path    TEXT,
  summary        JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawings_site_date ON drawings(site_id, work_date);

-- ── documents 테이블 ──
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  category    TEXT NOT NULL
    CHECK (category IN ('일지보고서','사진대지','도면마킹','안전서류',
                         '견적서','시공계획서','장비계획서','기타서류','확인서')),
  title       TEXT NOT NULL,
  file_url    TEXT,
  file_type   TEXT,
  file_size   INTEGER,
  uploaded_by UUID NOT NULL REFERENCES workers(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_site_category ON documents(site_id, category);

-- ── materials 테이블 (자재 마스터) ──
CREATE TABLE IF NOT EXISTS materials (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  spec       TEXT,
  unit       TEXT NOT NULL DEFAULT '개',
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── material_logs 테이블 (자재 입출고 내역) ──
CREATE TABLE IF NOT EXISTS material_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID NOT NULL REFERENCES sites(id),
  material_id  UUID NOT NULL REFERENCES materials(id),
  work_date    DATE NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('입고','출고','조정')),
  quantity     INTEGER NOT NULL,
  remarks     TEXT,
  created_by   UUID NOT NULL REFERENCES workers(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_logs_site ON material_logs(site_id, work_date);
CREATE INDEX IF NOT EXISTS idx_material_logs_material ON material_logs(material_id);

-- ── notifications 테이블 ──
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('rejection','approval','message','site_update','system')),
  title      TEXT NOT NULL,
  body       TEXT,
  href       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- ── user_ui_state 테이블 (상태 복원용) ──
CREATE TABLE IF NOT EXISTS user_ui_state (
  user_id                 UUID PRIMARY KEY REFERENCES workers(id) ON DELETE CASCADE,
  last_site_id           UUID REFERENCES sites(id),
  last_work_date         DATE,
  last_worklog_section   TEXT,
  last_preview_mode      TEXT,
  recent_worker_template  JSONB NOT NULL DEFAULT '[]',
  recent_tag_template    JSONB NOT NULL DEFAULT '{}',
  recent_material_template JSONB NOT NULL DEFAULT '[]',
  last_drawing_page      JSONB NOT NULL DEFAULT '{}',
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── salary_entries 테이블 (급여 명세) ──
CREATE TABLE IF NOT EXISTS salary_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  man         NUMERIC NOT NULL DEFAULT 0,
  daily_rate  INTEGER NOT NULL DEFAULT 0,
  gross_pay   INTEGER NOT NULL DEFAULT 0,
  deduction   INTEGER NOT NULL DEFAULT 0,
  net_pay     INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT '대기',
  worklog_ids UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- ── hq_requests 테이블 (본사요청) ──
CREATE TABLE IF NOT EXISTS hq_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES workers(id),
  site_id    UUID REFERENCES sites(id),
  category   TEXT NOT NULL,
  message   TEXT,
  source     TEXT NOT NULL DEFAULT 'kakao_channel',
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handled_at TIMESTAMPTZ,
  handled_by UUID REFERENCES workers(id)
);

-- ── audit_logs 테이블 ──
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES workers(id),
  action     TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id  UUID,
  old_value  JSONB,
  new_value  JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name, created_at DESC);

-- ── admin_directory 테이블 ──
CREATE TABLE IF NOT EXISTS admin_directory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  daily       INTEGER NOT NULL DEFAULT 0,
  contact     TEXT,
  affiliation TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── billing_docs 테이블 ──
CREATE TABLE IF NOT EXISTS billing_docs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    UUID NOT NULL REFERENCES sites(id),
  category   TEXT NOT NULL CHECK (category IN ('청구','미청구')),
  title      TEXT NOT NULL,
  amount     INTEGER,
  status     TEXT NOT NULL DEFAULT '미처리',
  file_url   TEXT,
  created_by UUID NOT NULL REFERENCES workers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── issues 테이블 ──
CREATE TABLE IF NOT EXISTS issues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  work_date   DATE,
  title       TEXT NOT NULL,
  content    TEXT,
  photos     TEXT[] NOT NULL DEFAULT '{}',
  status     TEXT NOT NULL DEFAULT '미처리' CHECK (status IN ('미처리','진행중','완료')),
  priority   TEXT NOT NULL DEFAULT '중요' CHECK (priority IN ('긴급','중요','일반')),
  due_date   DATE,
  assignee_id UUID REFERENCES workers(id),
  created_by  UUID NOT NULL REFERENCES workers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_site_status ON issues(site_id, status);

-- ── site_favorites 테이블 ──
CREATE TABLE IF NOT EXISTS site_favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  site_id    UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, site_id)
);

-- ── search_config 테이블 ──
CREATE TABLE IF NOT EXISTS search_config (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_query_length   INTEGER NOT NULL DEFAULT 2,
  debounce_ms       INTEGER NOT NULL DEFAULT 250,
  result_limit      INTEGER NOT NULL DEFAULT 10,
  enabled_entities   TEXT[] NOT NULL DEFAULT '{site,worker,document,worklog,issue,drawing}',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS (Row Level Security) 정책
-- ============================================================

-- workers 테이블
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workers_self" ON workers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "workers_admin_all" ON workers FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);

-- sites 테이블
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sites_read_worker" ON sites FOR SELECT USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager'))
  OR EXISTS (
    SELECT 1 FROM workers w
    WHERE w.id = auth.uid()
      AND w.role = 'partner'
      AND sites.allowed_companies @> ARRAY[w.company]
  )
  OR EXISTS (
    SELECT 1 FROM workers w
    WHERE w.id = auth.uid()
      AND w.role = 'worker'
      AND w.site_ids && ARRAY[sites.id]
  )
);
CREATE POLICY "sites_write_admin" ON sites FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);

-- daily_logs 테이블
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_logs_read" ON daily_logs FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager'))
  OR EXISTS (
    SELECT 1 FROM workers w, sites s
    WHERE w.id = auth.uid()
      AND w.role = 'partner'
      AND s.id = daily_logs.site_id
      AND s.allowed_companies @> ARRAY[w.company]
  )
);
CREATE POLICY "daily_logs_write" ON daily_logs FOR ALL USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager'))
);

-- photos 테이블
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_read" ON photos FOR SELECT USING (
  auth.uid() = uploaded_by
  OR EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager'))
  OR EXISTS (
    SELECT 1 FROM workers w, sites s
    WHERE w.id = auth.uid()
      AND w.role = 'partner'
      AND s.id = photos.site_id
      AND s.allowed_companies @> ARRAY[w.company]
  )
);
CREATE POLICY "photos_write" ON photos FOR ALL USING (auth.uid() = uploaded_by);

-- notifications 테이블
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_write" ON notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);

-- documents 테이블
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_read" ON documents FOR SELECT USING (
  auth.uid() = uploaded_by
  OR EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager'))
  OR EXISTS (
    SELECT 1 FROM workers w, sites s
    WHERE w.id = auth.uid()
      AND w.role = 'partner'
      AND s.id = documents.site_id
      AND s.allowed_companies @> ARRAY[w.company]
  )
);
CREATE POLICY "documents_write" ON documents FOR ALL USING (
  auth.uid() = uploaded_by
  OR EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager'))
);

-- materials / material_logs 테이블
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_read" ON materials FOR SELECT USING (true);
CREATE POLICY "materials_write" ON materials FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE material_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "material_logs_read" ON material_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager','worker'))
  OR EXISTS (
    SELECT 1 FROM workers w, sites s
    WHERE w.id = auth.uid()
      AND w.role = 'partner'
      AND s.id = material_logs.site_id
      AND s.allowed_companies @> ARRAY[w.company]
  )
);
CREATE POLICY "material_logs_write" ON material_logs FOR ALL USING (
  auth.uid() = created_by
  OR EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager'))
);

-- salary_entries 테이블
ALTER TABLE salary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salary_read_own" ON salary_entries FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager'))
);
CREATE POLICY "salary_write" ON salary_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin'))
);

-- audit_logs 테이블
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_read" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "audit_logs_write" ON audit_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);

-- user_ui_state 테이블
ALTER TABLE user_ui_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_ui_state_own" ON user_ui_state FOR ALL USING (auth.uid() = user_id);

-- issues 테이블
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issues_read" ON issues FOR SELECT USING (true);
CREATE POLICY "issues_write" ON issues FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager'))
);

-- site_favorites 테이블
ALTER TABLE site_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_favorites_own" ON site_favorites FOR ALL USING (auth.uid() = user_id);

-- billing_docs 테이블
ALTER TABLE billing_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_docs_read" ON billing_docs FOR SELECT USING (true);
CREATE POLICY "billing_docs_write" ON billing_docs FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager'))
);

-- hq_requests 테이블
ALTER TABLE hq_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_requests_read" ON hq_requests FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "hq_requests_write" ON hq_requests FOR ALL USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role IN ('admin','site_manager'))
);

-- admin_directory 테이블
ALTER TABLE admin_directory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_directory_read" ON admin_directory FOR SELECT USING (true);
CREATE POLICY "admin_directory_write" ON admin_directory FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);

-- search_config 테이블
ALTER TABLE search_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_config_read" ON search_config FOR SELECT USING (true);
CREATE POLICY "search_config_write" ON search_config FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);

-- companies 테이블
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_read" ON companies FOR SELECT USING (true);
CREATE POLICY "companies_write" ON companies FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- Trigger: updated_at 자동 갱신
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_salary_entries_updated_at BEFORE UPDATE ON salary_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Trigger: Auth.users → workers 자동 연동
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workers (id, email, name, company, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RPC: 역할 정규화 확인
-- ============================================================

CREATE OR REPLACE FUNCTION get_worker_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM workers WHERE id = p_user_id;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: Partner 현장 접근 필터
-- ============================================================

CREATE OR REPLACE FUNCTION get_accessible_sites(p_user_id UUID)
RETURNS TABLE(id UUID, name TEXT, company TEXT) AS $$
DECLARE
  v_role TEXT;
  v_company TEXT;
  v_site_ids UUID[];
BEGIN
  SELECT role, company, site_ids INTO v_role, v_company, v_site_ids
  FROM workers WHERE id = p_user_id;

  IF v_role = 'admin' THEN
    RETURN QUERY SELECT s.id, s.name, s.company FROM sites s ORDER BY s.name;
    RETURN;
  END IF;

  IF v_role = 'site_manager' THEN
    RETURN QUERY
    SELECT s.id, s.name, s.company
    FROM sites s
    WHERE s.id = ANY(v_site_ids)
    ORDER BY s.name;
    RETURN;
  END IF;

  IF v_role = 'partner' THEN
    RETURN QUERY
    SELECT s.id, s.name, s.company
    FROM sites s
    WHERE s.allowed_companies @> ARRAY[v_company]
    ORDER BY s.name;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, s.company
  FROM sites s
  WHERE s.id = ANY(v_site_ids)
  ORDER BY s.name;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
