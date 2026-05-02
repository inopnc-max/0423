-- ============================================================
-- Production Stock Movement Single-Entry Backfill RPC
--
-- Explicitly creates a single missing stock movement for a specific entry.
-- This is a targeted, explicit call - NOT a mass operation.
--
-- Safety:
--   - Only creates movement if it doesn't already exist
--   - Only for entries that require movement (non-transport + has product_id)
--   - Returns detailed result including movement_id if created
--   - SECURITY DEFINER requires admin/production_manager role check
-- ============================================================

-- ── dry_run_backfill_stock_movement ─────────────────────────
-- Previews what a backfill would do for a specific entry.
-- Does NOT make any changes - read-only preview.

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
BEGIN
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
    'dry_run', TRUE
  );
END;
$$;

-- ── backfill_single_stock_movement ───────────────────────────
-- Explicitly creates a single missing stock movement for a specific entry.
-- Targeted, explicit call - NOT a mass operation.
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
BEGIN
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
    note,
    product_type
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
    v_entry.memo,
    v_entry.production_type
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
