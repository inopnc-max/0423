-- ============================================================
-- Fix production_entries constraint and RPC
--
-- Problem:
--   - production_type column contains production types (생산, 판매, 자체사용, 운송비)
--   - product_type column should contain legacy distinction (NOT product name)
--   - product_name contains actual product name (NPC-1000, NPC-3000Q, etc.)
--   - The constraint on product_type only allowed npc1000/npc3000q/other
--   - The RPC was incorrectly setting product_type = production_type value
--
-- Solution:
--   1. Drop the incorrect constraint on product_type
--   2. Add proper constraint on production_type
--   3. Update RPC to set product_type = 'other' as legacy value
--      (product_name stores actual name like NPC-1000)
-- ============================================================

-- Step 1: Drop the constraint that only allows npc1000/npc3000q/other
-- (Will be re-added after fixing RPC to use 'other' for product_type)
ALTER TABLE public.production_entries
  DROP CONSTRAINT IF EXISTS production_entries_product_type_check;

-- Step 2: Add proper constraint for production_type (production category)
ALTER TABLE public.production_entries
  ADD CONSTRAINT production_entries_production_type_check
  CHECK (production_type IS NULL OR production_type IN ('생산', '판매', '자체사용', '운송비'));

-- Step 3: Create new RPC with fixed product_type handling
-- product_type stores 'other' as legacy value
-- product_name stores actual product name (NPC-1000, NPC-3000Q, etc.)

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
  v_product_type_val TEXT := 'other';
BEGIN
  -- Derive movement type and product type from production_type
  v_movement_type := CASE p_production_type
    WHEN '생산'    THEN 'production'
    WHEN '판매'    THEN 'sale'
    WHEN '자체사용' THEN 'self_use'
    ELSE NULL
  END;

  -- Set product_type: use 'other' as legacy value
  -- product_name has the actual product name (NPC-1000, NPC-3000Q, etc.)
  -- product_type is NOT NULL but stores legacy distinction only
  v_product_type_val := 'other';

  -- Invariant: non-transport types require product_id
  IF v_movement_type IS NOT NULL AND p_product_id IS NULL THEN
    RAISE EXCEPTION 'product_id is required for production_type %', p_production_type
      USING ERRCODE = '23502';
  END IF;

  -- Insert production entry
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
    v_product_type_val,  -- Always 'other' as legacy value
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
      note
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

-- Step 4: Update update_production_entry_with_movement RPC
-- Also fixes product_type to use 'other' instead of production_type

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
  -- Validate production_type
  IF p_production_type NOT IN ('생산', '판매', '자체사용', '운송비') THEN
    RAISE EXCEPTION 'Invalid production_type: %', p_production_type
      USING ERRCODE = '23502';
  END IF;

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
    product_type     = 'other',  -- Always 'other' as legacy value
    notes            = p_memo
  WHERE id = p_id
  RETURNING id INTO v_entry_id;

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
        note           = p_memo
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
        note
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

-- Step 5: Re-add product_type constraint with 'other' included
-- This ensures product_type only contains valid legacy values
ALTER TABLE public.production_entries
  ADD CONSTRAINT production_entries_product_type_check
  CHECK (product_type IN ('npc1000', 'npc3000q', 'other'));
