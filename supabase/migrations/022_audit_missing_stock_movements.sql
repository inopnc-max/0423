-- ============================================================
-- Production Stock Movement Audit & Remediation RPCs
-- Phase D: Audit missing stock movements and provide safe remediation
--
-- This migration adds RPC functions to:
--   1. Audit: Report entries with missing stock movements
--   2. Dry-run: Preview what a remediation would do without making changes
--   3. Remediate: Explicitly create missing stock movements for specific entries
--
-- Safety design:
--   - No automatic mass correction
--   - Dry-run required before remediation
--   - Each remediation call is explicit and targeted
--   - Admin-only access (role check enforced in function)
-- ============================================================

-- ── audit_missing_stock_movements ──────────────────────────
-- Reports all production entries that require a stock movement
-- but do not have one.
--
-- "Require movement" means:
--   - production_type IN ('생산', '판매', '자체사용') AND product_id IS NOT NULL
--
-- Returns: table of missing movements with entry details
--
-- Access: admin or production_manager only

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
  -- Verify caller is admin or production_manager
  IF NOT EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role IN ('admin', 'production_manager')
  ) THEN
    RAISE EXCEPTION 'Access denied: admin or production_manager role required'
      USING ERRCODE = 'P0001';
  END IF;

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
  ORDER BY e.work_date DESC, e.created_at DESC;
END;
$$;

-- ── audit_missing_movement_summary ─────────────────────────
-- Returns a summary count of missing movements by production_type.
-- Useful for quick overview before detailed audit.
--
-- Access: admin or production_manager only

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
  -- Verify caller is admin or production_manager
  IF NOT EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role IN ('admin', 'production_manager')
  ) THEN
    RAISE EXCEPTION 'Access denied: admin or production_manager role required'
      USING ERRCODE = 'P0001';
  END IF;

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

-- ── dry_run_backfill_stock_movement ─────────────────────────
-- Previews what a backfill would do for a specific entry.
-- Does NOT make any changes - read-only preview.
--
-- Returns the movement that WOULD be created, or reason why it cannot be.
--
-- Access: admin or production_manager only

CREATE OR REPLACE FUNCTION public.dry_run_backfill_stock_movement(
  p_entry_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry         RECORD;
  v_movement_type TEXT;
  v_result        JSONB;
BEGIN
  -- Verify caller is admin or production_manager
  IF NOT EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role IN ('admin', 'production_manager')
  ) THEN
    RAISE EXCEPTION 'Access denied: admin or production_manager role required'
      USING ERRCODE = 'P0001';
  END IF;

  -- Get entry details
  SELECT
    e.id,
    e.work_date,
    e.production_type,
    e.product_id,
    e.product_name,
    e.quantity,
    e.site_id,
    e.memo,
    e.created_by
  INTO v_entry
  FROM public.production_entries e
  WHERE e.id = p_entry_id;

  IF v_entry IS NULL THEN
    RETURN jsonb_build_object(
      'can_backfill', FALSE,
      'reason', 'Entry not found',
      'entry_id', p_entry_id
    );
  END IF;

  -- Check if movement type requires stock movement
  v_movement_type := CASE v_entry.production_type
    WHEN '생산'    THEN 'production'
    WHEN '판매'    THEN 'sale'
    WHEN '자체사용' THEN 'self_use'
    ELSE NULL
  END;

  IF v_movement_type IS NULL THEN
    RETURN jsonb_build_object(
      'can_backfill', FALSE,
      'reason', 'Transport entries do not require stock movements',
      'entry_id', p_entry_id,
      'production_type', v_entry.production_type
    );
  END IF;

  IF v_entry.product_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_backfill', FALSE,
      'reason', 'Entry has no product_id - cannot backfill',
      'entry_id', p_entry_id,
      'production_type', v_entry.production_type
    );
  END IF;

  -- Check if movement already exists
  IF EXISTS (
    SELECT 1
    FROM public.production_stock_movements m
    WHERE m.source_table = 'production_entries'
      AND m.source_id = p_entry_id
  ) THEN
    RETURN jsonb_build_object(
      'can_backfill', FALSE,
      'reason', 'Stock movement already exists for this entry',
      'entry_id', p_entry_id,
      'production_type', v_entry.production_type
    );
  END IF;

  -- Preview what WOULD be created
  RETURN jsonb_build_object(
    'can_backfill', TRUE,
    'entry_id', v_entry.id,
    'work_date', v_entry.work_date,
    'production_type', v_entry.production_type,
    'movement_type', v_movement_type,
    'product_id', v_entry.product_id,
    'product_name', v_entry.product_name,
    'quantity', v_entry.quantity,
    'site_id', v_entry.site_id,
    'notes', v_entry.memo,
    'created_by', v_entry.created_by,
    'dry_run', TRUE,
    'action', 'INSERT INTO production_stock_movements'
  );
END;
$$;

-- ── backfill_single_stock_movement ───────────────────────────
-- Explicitly creates a single missing stock movement for a specific entry.
-- This is a targeted, explicit call - not a mass operation.
--
-- Safety:
--   - Only creates movement if it doesn't already exist
--   - Only for entries that require movement (non-transport + has product_id)
--   - Returns detailed result including movement_id if created
--
-- Access: admin or production_manager only
--
-- Parameters:
--   p_entry_id  UUID - The production_entries.id to backfill

CREATE OR REPLACE FUNCTION public.backfill_single_stock_movement(
  p_entry_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry         RECORD;
  v_movement_type TEXT;
  v_movement_id   UUID;
  v_created       BOOLEAN := FALSE;
  v_reason        TEXT;
BEGIN
  -- Verify caller is admin or production_manager
  IF NOT EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role IN ('admin', 'production_manager')
  ) THEN
    RAISE EXCEPTION 'Access denied: admin or production_manager role required'
      USING ERRCODE = 'P0001';
  END IF;

  -- Get entry details
  SELECT
    e.id,
    e.work_date,
    e.production_type,
    e.product_id,
    e.product_name,
    e.quantity,
    e.site_id,
    e.memo,
    e.created_by
  INTO v_entry
  FROM public.production_entries e
  WHERE e.id = p_entry_id;

  IF v_entry IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'backfilled', FALSE,
      'reason', 'Entry not found',
      'entry_id', p_entry_id
    );
  END IF;

  -- Derive movement type
  v_movement_type := CASE v_entry.production_type
    WHEN '생산'    THEN 'production'
    WHEN '판매'    THEN 'sale'
    WHEN '자체사용' THEN 'self_use'
    ELSE NULL
  END;

  -- Validate: transport type doesn't need movement
  IF v_movement_type IS NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'backfilled', FALSE,
      'reason', 'Transport entries do not require stock movements',
      'entry_id', p_entry_id,
      'production_type', v_entry.production_type
    );
  END IF;

  -- Validate: needs product_id
  IF v_entry.product_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'backfilled', FALSE,
      'reason', 'Entry has no product_id - cannot backfill',
      'entry_id', p_entry_id,
      'production_type', v_entry.production_type
    );
  END IF;

  -- Check if movement already exists
  IF EXISTS (
    SELECT 1
    FROM public.production_stock_movements m
    WHERE m.source_table = 'production_entries'
      AND m.source_id = p_entry_id
  ) THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'backfilled', FALSE,
      'reason', 'Stock movement already exists for this entry',
      'entry_id', p_entry_id,
      'production_type', v_entry.production_type
    );
  END IF;

  -- Create the missing stock movement
  INSERT INTO public.production_stock_movements (
    product_id,
    movement_date,
    movement_type,
    quantity,
    unit_price,
    source_table,
    source_id,
    site_id,
    created_by,
    notes
  ) VALUES (
    v_entry.product_id,
    v_entry.work_date,
    v_movement_type,
    v_entry.quantity,
    0,
    'production_entries',
    v_entry.id,
    v_entry.site_id,
    v_entry.created_by,
    v_entry.memo
  )
  RETURNING id INTO v_movement_id;

  v_created := TRUE;

  RETURN jsonb_build_object(
    'success', TRUE,
    'backfilled', v_created,
    'entry_id', v_entry.id,
    'movement_id', v_movement_id,
    'movement_type', v_movement_type,
    'product_id', v_entry.product_id,
    'quantity', v_entry.quantity
  );
END;
$$;
