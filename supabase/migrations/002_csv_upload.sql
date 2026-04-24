-- ============================================================
-- INOPNC CSV 대량 업로드 마이그레이션 (Phase A Admin CSV 업로드 기능)
-- 관리자콘솔에서 workers/sites 대량 등록
-- ============================================================

-- ── CSV 업로드 로그 테이블 ──
CREATE TABLE IF NOT EXISTS csv_upload_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by   UUID NOT NULL REFERENCES workers(id),
  table_name    TEXT NOT NULL,
  filename      TEXT NOT NULL,
  total_rows   INTEGER NOT NULL DEFAULT 0,
  success_rows INTEGER NOT NULL DEFAULT 0,
  error_rows   INTEGER NOT NULL DEFAULT 0,
  errors       JSONB NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE csv_upload_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csv_upload_logs_read" ON csv_upload_logs FOR SELECT USING (
  auth.uid() = uploaded_by
  OR EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "csv_upload_logs_write" ON csv_upload_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM workers WHERE id = auth.uid() AND role = 'admin')
);

-- ── CSV 템플릿 정의 ──
-- Workers CSV: email, name, role, company, phone, daily, affiliation, title, site_ids
-- Sites CSV: name, company, affiliation, allowed_companies, address,
--           accommodation_address, manager, manager_phone, safety_manager, safety_phone, lat, lon

-- ============================================================
-- RPC: CSV Worker 대량 업로드
-- ============================================================

CREATE OR REPLACE FUNCTION csv_upload_workers(
  p_rows JSONB,
  p_upload_log_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, email TEXT, error TEXT) AS $$
DECLARE
  v_row JSONB;
  v_email TEXT;
  v_name TEXT;
  v_role TEXT;
  v_company TEXT;
  v_phone TEXT;
  v_daily INTEGER;
  v_affiliation TEXT;
  v_title TEXT;
  v_site_ids UUID[];
  v_user_id UUID;
  v_existing_id UUID;
  v_error TEXT;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_email := v_row->>'email';
    v_name := v_row->>'name';
    v_role := COALESCE(v_row->>'role', 'worker');
    v_company := COALESCE(v_row->>'company', '');
    v_phone := v_row->>'phone';
    v_daily := COALESCE((v_row->>'daily')::INTEGER, 150000);
    v_affiliation := v_row->>'affiliation';
    v_title := v_row->>'title';
    v_error := NULL;

    BEGIN
      v_site_ids := parse_site_ids(v_row->>'site_ids');

      SELECT id INTO v_existing_id FROM workers WHERE email = v_email;

      IF v_existing_id IS NOT NULL THEN
        UPDATE workers SET
          name = v_name,
          role = v_role,
          company = v_company,
          phone = v_phone,
          daily = v_daily,
          site_ids = v_site_ids,
          affiliation = v_affiliation,
          title = v_title,
          updated_at = NOW()
        WHERE id = v_existing_id;
        v_user_id := v_existing_id;
      ELSE
        INSERT INTO workers (email, name, role, company, phone, daily, site_ids, affiliation, title)
        VALUES (v_email, v_name, v_role, v_company, v_phone, v_daily, v_site_ids, v_affiliation, v_title)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          company = EXCLUDED.company,
          phone = EXCLUDED.phone,
          daily = EXCLUDED.daily,
          site_ids = EXCLUDED.site_ids,
          affiliation = EXCLUDED.affiliation,
          title = EXCLUDED.title,
          updated_at = NOW()
        RETURNING id INTO v_user_id;
      END IF;

      success := TRUE;
    EXCEPTION WHEN OTHERS THEN
      success := FALSE;
      v_error := SQLERRM;
    END;

    email := v_email;
    error := v_error;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── site_ids 파싱 헬퍼 ──
CREATE OR REPLACE FUNCTION parse_site_ids(p_input TEXT)
RETURNS UUID[] AS $$
DECLARE
  v_result UUID[] := '{}';
  v_part TEXT;
BEGIN
  IF p_input IS NULL OR p_input = '' THEN
    RETURN v_result;
  END IF;

  FOREACH v_part IN ARRAY STRING_TO_ARRAY(p_input, ';')
  LOOP
    v_part := TRIM(v_part);
    IF v_part ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_result := array_append(v_result, v_part::UUID);
    ELSE
      SELECT id INTO v_part FROM sites WHERE name = v_part LIMIT 1;
      IF v_part IS NOT NULL THEN
        v_result := array_append(v_result, v_part::UUID);
      END IF;
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RPC: CSV Site 대량 업로드
-- ============================================================

CREATE OR REPLACE FUNCTION csv_upload_sites(
  p_rows JSONB,
  p_upload_log_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, site_name TEXT, error TEXT) AS $$
DECLARE
  v_row JSONB;
  v_name TEXT;
  v_company TEXT;
  v_affiliation TEXT;
  v_allowed_companies TEXT[];
  v_address TEXT;
  v_accommodation_address TEXT;
  v_manager TEXT;
  v_manager_phone TEXT;
  v_safety_manager TEXT;
  v_safety_phone TEXT;
  v_lat DOUBLE PRECISION;
  v_lon DOUBLE PRECISION;
  v_existing_id UUID;
  v_new_id UUID;
  v_error TEXT;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_name := v_row->>'name';
    v_company := COALESCE(v_row->>'company', '');
    v_affiliation := v_row->>'affiliation';
    v_allowed_companies := STRING_TO_ARRAY(COALESCE(v_row->>'allowed_companies', ''), ';');
    v_address := v_row->>'address';
    v_accommodation_address := v_row->>'accommodation_address';
    v_manager := v_row->>'manager';
    v_manager_phone := v_row->>'manager_phone';
    v_safety_manager := v_row->>'safety_manager';
    v_safety_phone := v_row->>'safety_phone';
    v_lat := (v_row->>'lat')::DOUBLE PRECISION;
    v_lon := (v_row->>'lon')::DOUBLE PRECISION;
    v_error := NULL;

    BEGIN
      FOR i IN 1..array_length(v_allowed_companies, 1)
      LOOP
        v_allowed_companies[i] := TRIM(v_allowed_companies[i]);
      END LOOP;

      SELECT id INTO v_existing_id FROM sites WHERE name = v_name LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        UPDATE sites SET
          company = v_company,
          affiliation = v_affiliation,
          allowed_companies = v_allowed_companies,
          address = v_address,
          accommodation_address = v_accommodation_address,
          manager = v_manager,
          manager_phone = v_manager_phone,
          safety_manager = v_safety_manager,
          safety_phone = v_safety_phone,
          lat = v_lat,
          lon = v_lon,
          updated_at = NOW()
        WHERE id = v_existing_id;
        v_new_id := v_existing_id;
      ELSE
        INSERT INTO sites (
          name, company, affiliation, allowed_companies, address,
          accommodation_address, manager, manager_phone,
          safety_manager, safety_phone, lat, lon
        ) VALUES (
          v_name, v_company, v_affiliation, v_allowed_companies, v_address,
          v_accommodation_address, v_manager, v_manager_phone,
          v_safety_manager, v_safety_phone, v_lat, v_lon
        ) RETURNING id INTO v_new_id;
      END IF;

      success := TRUE;
    EXCEPTION WHEN OTHERS THEN
      success := FALSE;
      v_error := SQLERRM;
    END;

    site_name := v_name;
    error := v_error;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: CSV 업로드 로그 기록
-- ============================================================

CREATE OR REPLACE FUNCTION log_csv_upload(
  p_table_name TEXT,
  p_filename TEXT,
  p_total_rows INTEGER,
  p_results JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_success INTEGER := 0;
  v_error INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_row JSONB;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_results)
  LOOP
    IF (v_row->>'success')::BOOLEAN THEN
      v_success := v_success + 1;
    ELSE
      v_error := v_error + 1;
      v_errors := v_errors || jsonb_build_object(
        'email', v_row->>'email',
        'site_name', v_row->>'site_name',
        'error', v_row->>'error'
      );
    END IF;
  END LOOP;

  INSERT INTO csv_upload_logs (
    uploaded_by, table_name, filename, total_rows,
    success_rows, error_rows, errors, status
  )
  VALUES (
    auth.uid(), p_table_name, p_filename, p_total_rows,
    v_success, v_error, v_errors, 'completed'
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: 통합 검색
-- ============================================================

CREATE OR REPLACE FUNCTION search_unified(
  p_query TEXT,
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  entity_type TEXT,
  entity_id UUID,
  title TEXT,
  subtitle TEXT,
  href TEXT,
  score DOUBLE PRECISION
) AS $$
DECLARE
  v_role TEXT;
  v_company TEXT;
  v_site_ids UUID[];
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT role, company, site_ids INTO v_role, v_company, v_site_ids
    FROM workers WHERE id = p_user_id;
  END IF;

  -- Sites 검색
  RETURN QUERY
  SELECT
    'site'::TEXT,
    s.id,
    s.name::TEXT,
    COALESCE(s.company, '')::TEXT,
    '/site/' || s.id::TEXT,
    ts_rank(to_tsvector('simple', s.name || ' ' || COALESCE(s.company, '')),
             plainto_tsquery('simple', p_query))::DOUBLE PRECISION
  FROM sites s
  WHERE (
    v_role IN ('admin', 'site_manager')
    OR v_role = 'partner' AND s.allowed_companies @> ARRAY[v_company]
    OR v_role = 'worker' AND s.id = ANY(v_site_ids)
  )
    AND (
      s.name ILIKE '%' || p_query || '%'
      OR s.company ILIKE '%' || p_query || '%'
      OR s.address ILIKE '%' || p_query || '%'
    )
  ORDER BY ts_rank(to_tsvector('simple', s.name || ' ' || COALESCE(s.company, '')),
            plainto_tsquery('simple', p_query)) DESC
  LIMIT p_limit;

  -- Workers 검색 (Admin만)
  IF v_role = 'admin' THEN
    RETURN QUERY
    SELECT
      'worker'::TEXT,
      w.id,
      w.name::TEXT,
      COALESCE(w.company, '') || ' / ' || COALESCE(w.role, '')::TEXT,
      '/admin/users/' || w.id::TEXT,
      ts_rank(to_tsvector('simple', w.name || ' ' || COALESCE(w.email, '')),
               plainto_tsquery('simple', p_query))::DOUBLE PRECISION
    FROM workers w
    WHERE w.name ILIKE '%' || p_query || '%'
       OR w.email ILIKE '%' || p_query || '%'
    ORDER BY ts_rank DESC
    LIMIT p_limit;
  END IF;

  -- Documents 검색
  RETURN QUERY
  SELECT
    'document'::TEXT,
    d.id,
    d.title::TEXT,
    COALESCE(d.category, '')::TEXT,
    '/documents/' || d.id::TEXT,
    ts_rank(to_tsvector('simple', d.title || ' ' || COALESCE(d.category, '')),
             plainto_tsquery('simple', p_query))::DOUBLE PRECISION
  FROM documents d
  WHERE d.title ILIKE '%' || p_query || '%'
  ORDER BY ts_rank DESC
  LIMIT p_limit;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
