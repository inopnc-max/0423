-- ============================================================
-- A-core 테이블 RLS 활성화
-- PR #97 merge 전 migration 안정화를 위한 RLS 정책 추가
--
-- 주의:
--   - 기존 migration 001~009 수정 금지
--   - destructive policy 금지
--   - policy 중복 방지를 위해 DROP POLICY IF EXISTS 후 CREATE POLICY 사용
-- ============================================================

-- ── Helper: check if user is admin ────────────────────────────
-- admin role 확인 함수

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workers
    WHERE id = auth.uid()
    AND role IN ('admin')
  );
$$;

-- ── Helper: check if user is production_manager ─────────────────
-- 생산관리자 role 확인 함수

CREATE OR REPLACE FUNCTION auth.is_production_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workers
    WHERE id = auth.uid()
    AND role IN ('admin', 'production_manager', 'site_manager')
  );
$$;

-- ── Helper: check if user is site_manager ──────────────────────
-- 현장관리자 role 확인 함수

CREATE OR REPLACE FUNCTION auth.is_site_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workers
    WHERE id = auth.uid()
    AND role IN ('admin', 'site_manager')
  );
$$;

-- ============================================================
-- Document System Tables
-- ============================================================

-- ── document_versions ─────────────────────────────────────────

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_versions_select" ON document_versions;
CREATE POLICY "document_versions_select" ON document_versions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "document_versions_insert" ON document_versions;
CREATE POLICY "document_versions_insert" ON document_versions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── document_shares ────────────────────────────────────────────

ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_shares_select" ON document_shares;
CREATE POLICY "document_shares_select" ON document_shares
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR shared_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "document_shares_insert" ON document_shares;
CREATE POLICY "document_shares_insert" ON document_shares
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND shared_by = auth.uid()
  );

DROP POLICY IF EXISTS "document_shares_delete" ON document_shares;
CREATE POLICY "document_shares_delete" ON document_shares
  FOR DELETE
  USING (
    auth.is_admin()
    OR shared_by = auth.uid()
  );

-- ── document_audit_logs ───────────────────────────────────────

ALTER TABLE document_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_audit_logs_select" ON document_audit_logs;
CREATE POLICY "document_audit_logs_select" ON document_audit_logs
  FOR SELECT
  USING (auth.is_admin());

DROP POLICY IF EXISTS "document_audit_logs_insert" ON document_audit_logs;
CREATE POLICY "document_audit_logs_insert" ON document_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── document_requirements ─────────────────────────────────────

ALTER TABLE document_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_requirements_select" ON document_requirements;
CREATE POLICY "document_requirements_select" ON document_requirements
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_site_manager()
    )
  );

DROP POLICY IF EXISTS "document_requirements_insert" ON document_requirements;
CREATE POLICY "document_requirements_insert" ON document_requirements
  FOR INSERT
  WITH CHECK (auth.is_admin());

DROP POLICY IF EXISTS "document_requirements_update" ON document_requirements;
CREATE POLICY "document_requirements_update" ON document_requirements
  FOR UPDATE
  USING (auth.is_admin());

-- ── worker_required_documents ──────────────────────────────────

ALTER TABLE worker_required_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_required_documents_select" ON worker_required_documents;
CREATE POLICY "worker_required_documents_select" ON worker_required_documents
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "worker_required_documents_insert" ON worker_required_documents;
CREATE POLICY "worker_required_documents_insert" ON worker_required_documents
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "worker_required_documents_update" ON worker_required_documents;
CREATE POLICY "worker_required_documents_update" ON worker_required_documents
  FOR UPDATE
  USING (
    auth.is_admin()
    OR user_id = auth.uid()
  );

-- ── nav_update_events ─────────────────────────────────────────
-- 사용자별 알림/이벤트 - 본인의 데이터만 접근

ALTER TABLE nav_update_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nav_update_events_select" ON nav_update_events;
CREATE POLICY "nav_update_events_select" ON nav_update_events
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "nav_update_events_insert" ON nav_update_events;
CREATE POLICY "nav_update_events_insert" ON nav_update_events
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "nav_update_events_update" ON nav_update_events;
CREATE POLICY "nav_update_events_update" ON nav_update_events
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "nav_update_events_delete" ON nav_update_events;
CREATE POLICY "nav_update_events_delete" ON nav_update_events
  FOR DELETE
  USING (user_id = auth.uid());

-- ── document_view_events ──────────────────────────────────────

ALTER TABLE document_view_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_view_events_select" ON document_view_events;
CREATE POLICY "document_view_events_select" ON document_view_events
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "document_view_events_insert" ON document_view_events;
CREATE POLICY "document_view_events_insert" ON document_view_events
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- ============================================================
-- Confirmation & Salary Tables
-- ============================================================

-- ── confirmation_forms ────────────────────────────────────────

ALTER TABLE confirmation_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "confirmation_forms_select" ON confirmation_forms;
CREATE POLICY "confirmation_forms_select" ON confirmation_forms
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_site_manager()
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "confirmation_forms_insert" ON confirmation_forms;
CREATE POLICY "confirmation_forms_insert" ON confirmation_forms
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_site_manager()
    )
  );

DROP POLICY IF EXISTS "confirmation_forms_update" ON confirmation_forms;
CREATE POLICY "confirmation_forms_update" ON confirmation_forms
  FOR UPDATE
  USING (
    auth.is_admin()
    OR auth.is_site_manager()
    OR user_id = auth.uid()
  );

-- ── confirmation_form_snapshots ───────────────────────────────

ALTER TABLE confirmation_form_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "confirmation_form_snapshots_select" ON confirmation_form_snapshots;
CREATE POLICY "confirmation_form_snapshots_select" ON confirmation_form_snapshots
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_site_manager()
      OR generated_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "confirmation_form_snapshots_insert" ON confirmation_form_snapshots;
CREATE POLICY "confirmation_form_snapshots_insert" ON confirmation_form_snapshots
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_site_manager()
    )
  );

-- ── salary_statements ─────────────────────────────────────────

ALTER TABLE salary_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salary_statements_select" ON salary_statements;
CREATE POLICY "salary_statements_select" ON salary_statements
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_site_manager()
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "salary_statements_insert" ON salary_statements;
CREATE POLICY "salary_statements_insert" ON salary_statements
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_site_manager()
    )
  );

DROP POLICY IF EXISTS "salary_statements_update" ON salary_statements;
CREATE POLICY "salary_statements_update" ON salary_statements
  FOR UPDATE
  USING (
    auth.is_admin()
    OR auth.is_site_manager()
  );

-- ── salary_entries ───────────────────────────────────────────

ALTER TABLE salary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salary_entries_select" ON salary_entries;
CREATE POLICY "salary_entries_select" ON salary_entries
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_site_manager()
    )
  );

DROP POLICY IF EXISTS "salary_entries_insert" ON salary_entries;
CREATE POLICY "salary_entries_insert" ON salary_entries
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_site_manager()
    )
  );

DROP POLICY IF EXISTS "salary_entries_update" ON salary_entries;
CREATE POLICY "salary_entries_update" ON salary_entries
  FOR UPDATE
  USING (
    auth.is_admin()
    OR auth.is_site_manager()
  );

-- ============================================================
-- Production Tables
-- ============================================================

-- ── products ──────────────────────────────────────────────────

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products
  FOR UPDATE
  USING (
    auth.is_admin()
    OR auth.is_production_manager()
  );

-- ── product_units ─────────────────────────────────────────────

ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_units_select" ON product_units;
CREATE POLICY "product_units_select" ON product_units
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

DROP POLICY IF EXISTS "product_units_insert" ON product_units;
CREATE POLICY "product_units_insert" ON product_units
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

-- ── production_batches ────────────────────────────────────────

ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "production_batches_select" ON production_batches;
CREATE POLICY "production_batches_select" ON production_batches
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
      OR auth.is_site_manager()
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "production_batches_insert" ON production_batches;
CREATE POLICY "production_batches_insert" ON production_batches
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
      OR auth.is_site_manager()
    )
  );

DROP POLICY IF EXISTS "production_batches_update" ON production_batches;
CREATE POLICY "production_batches_update" ON production_batches
  FOR UPDATE
  USING (
    auth.is_admin()
    OR auth.is_production_manager()
    OR auth.is_site_manager()
  );

-- ── production_sales ──────────────────────────────────────────

ALTER TABLE production_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "production_sales_select" ON production_sales;
CREATE POLICY "production_sales_select" ON production_sales
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
      OR auth.is_site_manager()
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "production_sales_insert" ON production_sales;
CREATE POLICY "production_sales_insert" ON production_sales
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

DROP POLICY IF EXISTS "production_sales_update" ON production_sales;
CREATE POLICY "production_sales_update" ON production_sales
  FOR UPDATE
  USING (
    auth.is_admin()
    OR auth.is_production_manager()
  );

-- ── production_self_use ────────────────────────────────────────

ALTER TABLE production_self_use ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "production_self_use_select" ON production_self_use;
CREATE POLICY "production_self_use_select" ON production_self_use
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
      OR auth.is_site_manager()
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "production_self_use_insert" ON production_self_use;
CREATE POLICY "production_self_use_insert" ON production_self_use
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

DROP POLICY IF EXISTS "production_self_use_update" ON production_self_use;
CREATE POLICY "production_self_use_update" ON production_self_use
  FOR UPDATE
  USING (
    auth.is_admin()
    OR auth.is_production_manager()
  );

-- ── production_transport_costs ────────────────────────────────

ALTER TABLE production_transport_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "production_transport_costs_select" ON production_transport_costs;
CREATE POLICY "production_transport_costs_select" ON production_transport_costs
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
      OR auth.is_site_manager()
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "production_transport_costs_insert" ON production_transport_costs;
CREATE POLICY "production_transport_costs_insert" ON production_transport_costs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

DROP POLICY IF EXISTS "production_transport_costs_update" ON production_transport_costs;
CREATE POLICY "production_transport_costs_update" ON production_transport_costs
  FOR UPDATE
  USING (
    auth.is_admin()
    OR auth.is_production_manager()
  );

-- ── production_stock_movements ────────────────────────────────

ALTER TABLE production_stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "production_stock_movements_select" ON production_stock_movements;
CREATE POLICY "production_stock_movements_select" ON production_stock_movements
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
      OR auth.is_site_manager()
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "production_stock_movements_insert" ON production_stock_movements;
CREATE POLICY "production_stock_movements_insert" ON production_stock_movements
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

DROP POLICY IF EXISTS "production_stock_movements_update" ON production_stock_movements;
CREATE POLICY "production_stock_movements_update" ON production_stock_movements
  FOR UPDATE
  USING (
    auth.is_admin()
    OR auth.is_production_manager()
  );

-- ── production_inventory_snapshots ─────────────────────────────

ALTER TABLE production_inventory_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "production_inventory_snapshots_select" ON production_inventory_snapshots;
CREATE POLICY "production_inventory_snapshots_select" ON production_inventory_snapshots
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
      OR auth.is_site_manager()
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "production_inventory_snapshots_insert" ON production_inventory_snapshots;
CREATE POLICY "production_inventory_snapshots_insert" ON production_inventory_snapshots
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

-- ── production_clients ────────────────────────────────────────

ALTER TABLE production_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "production_clients_select" ON production_clients;
CREATE POLICY "production_clients_select" ON production_clients
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

DROP POLICY IF EXISTS "production_clients_insert" ON production_clients;
CREATE POLICY "production_clients_insert" ON production_clients
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

DROP POLICY IF EXISTS "production_clients_update" ON production_clients;
CREATE POLICY "production_clients_update" ON production_clients
  FOR UPDATE
  USING (
    auth.is_admin()
    OR auth.is_production_manager()
  );

-- ── production_settings ───────────────────────────────────────

ALTER TABLE production_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "production_settings_select" ON production_settings;
CREATE POLICY "production_settings_select" ON production_settings
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

DROP POLICY IF EXISTS "production_settings_insert" ON production_settings;
CREATE POLICY "production_settings_insert" ON production_settings
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      auth.is_admin()
      OR auth.is_production_manager()
    )
  );

DROP POLICY IF EXISTS "production_settings_update" ON production_settings;
CREATE POLICY "production_settings_update" ON production_settings
  FOR UPDATE
  USING (
    auth.is_admin()
    OR auth.is_production_manager()
  );

-- ============================================================
-- Centralized Audit Logs
-- ============================================================

-- ── audit_logs ───────────────────────────────────────────────

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT
  USING (auth.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
