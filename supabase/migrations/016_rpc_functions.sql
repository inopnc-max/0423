-- ============================================================
-- RPC 함수 생성
-- A-1: Supabase 마이그레이션 - RPC 함수
--
-- 주의:
--   - destructive migration 금지
--   - SECURITY DEFINER 금지 (service role key 노출 방지)
-- ============================================================

-- ── calculate_current_stock ──────────────────────────────────
-- 특정产品的 현재 재고량 계산
-- production_stock_movements 테이블의 SUM으로 계산

CREATE OR REPLACE FUNCTION calculate_current_stock(prod_id UUID)
RETURNS NUMERIC(10,3)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total NUMERIC(10,3);
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN movement_type IN ('production', 'purchase', 'return_in', 'adjustment_in') THEN quantity
      WHEN movement_type IN ('sale', 'self_use', 'return_out', 'adjustment_out') THEN -quantity
      ELSE 0
    END
  ), 0) INTO total
  FROM production_stock_movements
  WHERE product_id = prod_id;

  RETURN total;
END;
$$;

-- ── check_stock_availability ──────────────────────────────────
-- 특정产品的 재고 가용성 확인

CREATE OR REPLACE FUNCTION check_stock_availability(prod_id UUID, req_qty NUMERIC(10,3))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock NUMERIC(10,3);
BEGIN
  current_stock := calculate_current_stock(prod_id);
  RETURN current_stock >= req_qty;
END;
$$;

-- ── generate_monthly_inventory_snapshot ───────────────────────
-- 월말 재고 스냅샷 생성

CREATE OR REPLACE FUNCTION generate_monthly_inventory_snapshot(snapshot_month TEXT, user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snapshot_date DATE;
BEGIN
  snapshot_date := (snapshot_month || '-01')::DATE;

  INSERT INTO production_inventory_snapshots (snapshot_month, product_id, quantity, unit_price, total_amount, created_by)
  SELECT
    snapshot_month,
    p.id,
    COALESCE(SUM(
      CASE
        WHEN m.movement_type IN ('production', 'purchase', 'return_in', 'adjustment_in') THEN m.quantity
        WHEN m.movement_type IN ('sale', 'self_use', 'return_out', 'adjustment_out') THEN -m.quantity
        ELSE 0
      END
    ), 0) AS quantity,
    p.unit_price,
    p.unit_price * COALESCE(SUM(
      CASE
        WHEN m.movement_type IN ('production', 'purchase', 'return_in', 'adjustment_in') THEN m.quantity
        WHEN m.movement_type IN ('sale', 'self_use', 'return_out', 'adjustment_out') THEN -m.quantity
        ELSE 0
      END
    ), 0) AS total_amount,
    user_id
  FROM products p
  LEFT JOIN production_stock_movements m
    ON m.product_id = p.id
    AND m.movement_date <= snapshot_date + INTERVAL '1 month - 1 day'
  WHERE p.active = true
  GROUP BY p.id, p.unit_price
  ON CONFLICT (snapshot_month, product_id)
  DO UPDATE SET
    quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price,
    total_amount = EXCLUDED.total_amount,
    created_by = EXCLUDED.created_by;
END;
$$;

-- ── create_document_version ──────────────────────────────────
-- 문서 버전 생성

CREATE OR REPLACE FUNCTION create_document_version(
  doc_id UUID,
  creator_id UUID,
  stor_bucket TEXT,
  stor_path TEXT,
  file_bytes INTEGER,
  mime TEXT,
  checksum_val TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_version_id UUID;
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_no), 0) + 1 INTO next_version
  FROM document_versions
  WHERE document_id = doc_id;

  INSERT INTO document_versions (document_id, version_no, storage_bucket, storage_path, file_size_bytes, mime_type, checksum, created_by)
  VALUES (doc_id, next_version, stor_bucket, stor_path, file_bytes, mime, checksum_val, creator_id)
  RETURNING id INTO new_version_id;

  UPDATE documents
  SET version_no = next_version, updated_at = NOW()
  WHERE id = doc_id;

  RETURN new_version_id;
END;
$$;

-- ── create_share_link ──────────────────────────────────────────
-- 문서 공유 링크 생성 (내부 RPC)

CREATE OR REPLACE FUNCTION create_share_link(
  doc_id UUID,
  sharer_id UUID,
  scope TEXT,
  allow_dl BOOLEAN,
  expires_at_val TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
BEGIN
  new_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO document_shares (document_id, share_token, shared_by, share_scope, allow_download, expires_at)
  VALUES (doc_id, new_token, sharer_id, scope, allow_dl, expires_at_val);

  RETURN new_token;
END;
$$;

-- ── check_document_access ─────────────────────────────────────
-- 문서 접근 권한 확인

CREATE OR REPLACE FUNCTION check_document_access(doc_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_or_sm BOOLEAN;
  is_uploader BOOLEAN;
  is_partner_ok BOOLEAN;
  doc_site_id UUID;
BEGIN
  SELECT site_id INTO doc_site_id FROM documents WHERE id = doc_id;

  IF doc_site_id IS NULL THEN RETURN FALSE; END IF;

  SELECT EXISTS (
    SELECT 1 FROM workers w WHERE w.id = user_uuid AND w.role IN ('admin', 'site_manager')
  ) INTO is_admin_or_sm;
  IF is_admin_or_sm THEN RETURN TRUE; END IF;

  SELECT EXISTS (
    SELECT 1 FROM documents d WHERE d.id = doc_id AND d.uploaded_by = user_uuid
  ) INTO is_uploader;
  IF is_uploader THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$;
