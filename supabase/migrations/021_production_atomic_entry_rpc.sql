-- ============================================================
-- Production Entry + Stock Movement Atomic RPC
-- Phase C: Atomic transaction for entry save/update + movement
--
-- New RPC functions that wrap entry insert/update + stock movement
-- in a single database transaction for atomicity.
-- ============================================================

-- ── save_production_entry_with_movement ────────────────────
-- Atomic: insert entry + record stock movement in one transaction.
-- Returns entry id and movement status.
--
-- Parameters:
--   p_work_date        DATE    - Work date
--   p_production_type  TEXT    - '생산', '판매', '자체사용', '운송비'
--   p_product_id       UUID    - FK to products.id (nullable for transport)
--   p_product_name     TEXT    - Product display name
--   p_quantity         NUMERIC - Entry quantity
--   p_unit             TEXT    - Unit (default '개')
--   p_amount           INTEGER - Total amount
--   p_site_id          UUID    - Site id (optional)
--   p_memo             TEXT    - Notes (optional)
--   p_created_by       UUID    - Worker id

CREATE OR REPLACE FUNCTION public.save_production_entry_with_movement(
  p_work_date        DATE,
  p_production_type  TEXT,
  p_product_id       UUID,
  p_product_name     TEXT,
  p_quantity         NUMERIC(10,3),
  p_unit             TEXT DEFAULT '개',
  p_amount           INTEGER DEFAULT 0,
  p_site_id          UUID DEFAULT NULL,
  p_memo             TEXT DEFAULT NULL,
  p_created_by       UUID
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

  -- Insert production entry
  INSERT INTO public.production_entries (
    work_date,
    production_type,
    product_name,
    product_id,
    quantity,
    unit,
    amount,
    site_id,
    memo,
    created_by
  ) VALUES (
    p_work_date,
    p_production_type,
    p_product_name,
    p_product_id,
    p_quantity,
    p_unit,
    p_amount,
    p_site_id,
    p_memo,
    p_created_by
  )
  RETURNING id INTO v_entry_id;

  -- Record stock movement if applicable
  IF v_movement_type IS NOT NULL AND p_product_id IS NOT NULL THEN
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
      p_product_id,
      p_work_date,
      v_movement_type,
      p_quantity,
      0,
      'production_entries',
      v_entry_id,
      p_site_id,
      p_created_by,
      p_memo
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
-- Returns entry id and movement status.
--
-- Parameters:
--   p_id               UUID    - Entry id to update
--   p_work_date        DATE    - Work date
--   p_production_type  TEXT    - '생산', '판매', '자체사용', '운송비'
--   p_product_id       UUID    - FK to products.id (nullable for transport)
--   p_product_name     TEXT    - Product display name
--   p_quantity         NUMERIC - Entry quantity
--   p_unit             TEXT    - Unit
--   p_amount           INTEGER - Total amount
--   p_site_id          UUID    - Site id (optional)
--   p_memo             TEXT    - Notes (optional)
--   p_created_by       UUID    - Worker id

CREATE OR REPLACE FUNCTION public.update_production_entry_with_movement(
  p_id               UUID,
  p_work_date        DATE,
  p_production_type  TEXT,
  p_product_id       UUID,
  p_product_name     TEXT,
  p_quantity         NUMERIC(10,3),
  p_unit             TEXT DEFAULT '개',
  p_amount           INTEGER DEFAULT 0,
  p_site_id          UUID DEFAULT NULL,
  p_memo             TEXT DEFAULT NULL,
  p_created_by       UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_entry_id         UUID := p_id;
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

  -- Update production entry
  UPDATE public.production_entries
  SET
    work_date        = p_work_date,
    production_type  = p_production_type,
    product_name     = p_product_name,
    product_id       = p_product_id,
    quantity         = p_quantity,
    unit             = p_unit,
    amount           = p_amount,
    site_id          = p_site_id,
    memo             = p_memo
  WHERE id = p_id;

  -- If production_type is not storable (운송비), reverse existing movement
  IF v_movement_type IS NULL THEN
    DELETE FROM public.production_stock_movements
    WHERE source_table = 'production_entries'
      AND source_id = p_id;

  ELSIF p_product_id IS NULL THEN
    -- No product but storable type - reverse movement
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
      -- Update existing movement
      UPDATE public.production_stock_movements
      SET
        product_id     = p_product_id,
        movement_date   = p_work_date,
        movement_type  = v_movement_type,
        quantity       = p_quantity,
        site_id        = p_site_id,
        notes          = p_memo
      WHERE id = v_existing_id
      RETURNING id INTO v_movement_id;

      v_movement_created := TRUE;
    ELSE
      -- Insert new movement
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
        p_product_id,
        p_work_date,
        v_movement_type,
        p_quantity,
        0,
        'production_entries',
        p_id,
        p_site_id,
        p_created_by,
        p_memo
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
-- Returns success status.
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
  v_deleted BOOLEAN := FALSE;
BEGIN
  -- Delete stock movements first
  DELETE FROM public.production_stock_movements
  WHERE source_table = 'production_entries'
    AND source_id = p_id;

  -- Delete production entry
  DELETE FROM public.production_entries
  WHERE id = p_id;

  -- Check if entry was actually deleted
  IF NOT EXISTS (SELECT 1 FROM public.production_entries WHERE id = p_id) THEN
    v_deleted := TRUE;
  END IF;

  RETURN jsonb_build_object(
    'deleted', v_deleted
  );
END;
$$;
