-- ============================================================
-- Production Stock Movement Audit RPCs
--
-- Functions to audit and report entries with missing stock movements.
-- These are read-only diagnostic functions with SECURITY DEFINER.
--
-- Safety design:
--   - No automatic mass correction
--   - Read-only audit functions
--   - Individual backfill via separate 027 migration
-- ============================================================

-- ── audit_missing_stock_movements ──────────────────────────
-- Reports all production entries that require a stock movement
-- but do not have one.
--
-- "Require movement" means:
--   - production_type IN ('생산', '판매', '자체사용') AND product_id IS NOT NULL

CREATE OR REPLACE FUNCTION public.audit_missing_stock_movements()
RETURNS TABLE (
  entry_id          UUID,
  entry_work_date   DATE,
  production_type   TEXT,
  product_id        UUID,
  product_name      TEXT,
  quantity          NUMERIC(10,3),
  created_by        UUID,
  entry_created_at  TIMESTAMPTZ,
  site_id           UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.work_date,
    e.production_type,
    e.product_id,
    e.product_name,
    e.quantity,
    e.created_by,
    e.created_at,
    e.site_id
  FROM public.production_entries e
  WHERE e.production_type IN ('생산', '판매', '자체사용')
    AND e.product_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.production_stock_movements m
      WHERE m.source_table = 'production_entries'
        AND m.source_id = e.id
    )
  ORDER BY e.work_date DESC NULLS LAST, e.created_at DESC;
END;
$$;

-- ── audit_missing_movement_summary ─────────────────────────
-- Returns a summary count of missing movements by production_type.

CREATE OR REPLACE FUNCTION public.audit_missing_movement_summary()
RETURNS TABLE (
  production_type   TEXT,
  missing_count     BIGINT,
  total_quantity    NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.production_type,
    COUNT(*)::BIGINT AS missing_count,
    COALESCE(SUM(e.quantity), 0)::NUMERIC AS total_quantity
  FROM public.production_entries e
  WHERE e.production_type IN ('생산', '판매', '자체사용')
    AND e.product_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.production_stock_movements m
      WHERE m.source_table = 'production_entries'
        AND m.source_id = e.id
    )
  GROUP BY e.production_type
  ORDER BY e.production_type;
END;
$$;
