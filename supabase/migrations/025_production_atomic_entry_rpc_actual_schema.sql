-- ============================================================
-- Production Entry + Stock Movement Atomic RPC
--
-- Atomic transaction functions that wrap entry CRUD + stock movement
-- in a single database transaction for atomicity.
--
-- Enforces invariants:
--   - Non-transport types (생산/판매/자체사용) require product_id
--   - Update/delete target rows must exist
--
-- Note: This migration was recreated against the actual production
-- schema which differs from the original 021 design:
--   - production_entries uses entry_date, product_type (legacy)
--   - production_entries has product_id, work_date, production_type (new)
--   - production_stock_movements links via source_table, source_id
-- ============================================================

-- ── save_production_entry_with_movement ────────────────────
-- Atomic: insert entry + record stock movement in one transaction.
-- Returns entry id and movement status.
-- Invariant: non-transport types require product_id.
--
-- Parameters:
--   p_work_date        DATE    - Work date
--   p_production_type  TEXT    - '생산', '판매', '자체사용', '운송비'
--   p_product_id       UUID    - FK to products.id (nullable for transport)
--   p_product_name     TEXT    - Product display name
--   p_quantity         NUMERIC - Entry quantity
--   p_created_by       UUID    - Worker id
--   p_unit             TEXT    - Unit (default '개')
--   p_amount           INTEGER - Total amount (default 0)
--   p_site_id          UUID    - Site id (optional)
--   p_memo             TEXT    - Notes (optional)
--   p_user_id          UUID    - User id (optional, defaults to p_created_by)

CREATE OR REPLACE FUNCTION public.save_production_entry_with_movement(
  p_work_date        DATE,
  p_production_type  TEXT,
  p_product_id       UUID,
  p_product_name     TEXT,
  p_quantity         NUMERIC(10,3),
  p_created_by       UUID,
  p_unit             TEXT DEFAULT '개',
  p_amount           INTEGER DEFAULT 0,
  p_site_id          UUID DEFAULT NULL,
  p_memo             TEXT DEFAULT NULL,
  p_user_id          UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_entry_id         UUID;
  v_movement_id      UUID;
  v_movement_type    TEXT;
  v_movement_created BOOLEAN := FALSE;
BEGIN
  -- Derive movement type from production_type
  v_movement_type := CASE p_production_type
    WHEN '생산'    THEN 'production'
    WHEN '판매'    THEN 'sale'
    WHEN '자체사용' THEN 'self_use'
    ELSE NULL
  END;

  -- Invariant: non-transport types require product_id
  IF v_movement_type IS NOT NULL AND p_product_id IS NULL THEN
    RAISE EXCEPTION 'product_id is required for production_type %', p_production_type
      USING ERRCODE = '23502';
  END IF;

  -- Insert production entry (sync both legacy and new column names)
  INSERT INTO public.production_entries (
    work_date,
    production_type,
    product_id,
    product_name,
    quantity,
    unit,
    amount,
    site_id,
    memo,
    created_by,
    user_id,
    entry_date,
    product_type,
    notes
  ) VALUES (
    p_work_date,
    p_production_type,
    p_product_id,
    p_product_name,
    p_quantity,
    p_unit,
    p_amount,
    p_site_id,
    p_memo,
    p_created_by,
    COALESCE(p_user_id, p_created_by),
    p_work_date,
    p_production_type,
    p_memo
  )
  RETURNING id INTO v_entry_id;

  -- Record stock movement if applicable
  IF v_movement_type IS NOT NULL THEN
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
      p_product_id,
      p_work_date,
      v_movement_type,
      p_quantity,
      0,
      'production_entries',
      v_entry_id,
      p_site_id,
      p_created_by,
      p_memo,
      p_production_type
    )
    RETURNING id INTO v_movement_id;

    v_movement_created := TRUE;
  END IF;

  RETURN jsonb_build_object(
    'id', v_entry_id,
    'movement_id', v_movement_id,
    'movement_created', v_movement_created
  );
END;
$$;

-- ── update_production_entry_with_movement ────────────────────
-- Atomic: update entry + upsert stock movement in one transaction.
-- Invariants:
--   - Non-transport types require product_id
--   - Target entry row must exist
--
-- Parameters:
--   p_id               UUID    - Entry id to update
--   p_work_date        DATE    - Work date
--   p_production_type  TEXT    - '생산', '판매', '자체사용', '운송비'
--   p_product_id       UUID    - FK to products.id
--   p_product_name     TEXT    - Product display name
--   p_quantity         NUMERIC - Entry quantity
--   p_created_by       UUID    - Worker id
--   p_unit             TEXT    - Unit
--   p_amount           INTEGER - Total amount
--   p_site_id          UUID    - Site id (optional)
--   p_memo             TEXT    - Notes (optional)

CREATE OR REPLACE FUNCTION public.update_production_entry_with_movement(
  p_id               UUID,
  p_work_date        DATE,
  p_production_type  TEXT,
  p_product_id       UUID,
  p_product_name     TEXT,
  p_quantity         NUMERIC(10,3),
  p_created_by       UUID,
  p_unit             TEXT DEFAULT '개',
  p_amount           INTEGER DEFAULT 0,
  p_site_id          UUID DEFAULT NULL,
  p_memo             TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_entry_id         UUID;
  v_movement_id      UUID;
  v_movement_type    TEXT;
  v_movement_created BOOLEAN := FALSE;
  v_existing_id      UUID;
BEGIN
  -- Derive movement type from production_type
  v_movement_type := CASE p_production_type
    WHEN '생산'    THEN 'production'
    WHEN '판매'    THEN 'sale'
    WHEN '자체사용' THEN 'self_use'
    ELSE NULL
  END;

  -- Invariant: non-transport types require product_id
  IF v_movement_type IS NOT NULL AND p_product_id IS NULL THEN
    RAISE EXCEPTION 'product_id is required for production_type %', p_production_type
      USING ERRCODE = '23502';
  END IF;

  -- Update production entry
  UPDATE public.production_entries
  SET
    work_date        = p_work_date,
    production_type  = p_production_type,
    product_id       = p_product_id,
    product_name     = p_product_name,
    quantity         = p_quantity,
    unit             = p_unit,
    amount           = p_amount,
    site_id          = p_site_id,
    memo             = p_memo,
    entry_date       = p_work_date,
    product_type     = p_production_type,
    notes            = p_memo
  WHERE id = p_id
  RETURNING id INTO v_entry_id;

  -- Invariant: target row must exist
  IF v_entry_id IS NULL THEN
    RAISE EXCEPTION 'production entry not found: %', p_id
      USING ERRCODE = 'P0002';
  END IF;

  -- If transport type, delete existing movement
  IF v_movement_type IS NULL THEN
    DELETE FROM public.production_stock_movements
    WHERE source_table = 'production_entries'
      AND source_id = p_id;

  ELSE
    -- Upsert stock movement
    SELECT id INTO v_existing_id
    FROM public.production_stock_movements
    WHERE source_table = 'production_entries'
      AND source_id = p_id;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.production_stock_movements
      SET
        product_id     = p_product_id,
        movement_date  = p_work_date,
        movement_type  = v_movement_type,
        quantity       = p_quantity,
        site_id        = p_site_id,
        note           = p_memo,
        product_type   = p_production_type
      WHERE id = v_existing_id
      RETURNING id INTO v_movement_id;

      v_movement_created := TRUE;
    ELSE
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
        p_product_id,
        p_work_date,
        v_movement_type,
        p_quantity,
        0,
        'production_entries',
        p_id,
        p_site_id,
        p_created_by,
        p_memo,
        p_production_type
      )
      RETURNING id INTO v_movement_id;

      v_movement_created := TRUE;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_entry_id,
    'movement_id', v_movement_id,
    'movement_created', v_movement_created
  );
END;
$$;

-- ── delete_production_entry_with_movement ────────────────────
-- Atomic: delete entry + reverse stock movement in one transaction.
-- Invariant: target entry row must exist.
--
-- Parameters:
--   p_id               UUID    - Entry id to delete

CREATE OR REPLACE FUNCTION public.delete_production_entry_with_movement(
  p_id               UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_deleted_id       UUID;
BEGIN
  -- Delete stock movements first
  DELETE FROM public.production_stock_movements
  WHERE source_table = 'production_entries'
    AND source_id = p_id;

  -- Delete production entry
  DELETE FROM public.production_entries
  WHERE id = p_id
  RETURNING id INTO v_deleted_id;

  -- Invariant: target row must exist
  IF v_deleted_id IS NULL THEN
    RAISE EXCEPTION 'production entry not found: %', p_id
      USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'deleted', TRUE,
    'id', v_deleted_id
  );
END;
$$;
