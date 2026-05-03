-- ============================================================
-- Fix production_stock_movements movement_type and product_type
--
-- 1. Update movement_type constraint to include 'production', 'sale', 'self_use'
-- 2. Fix save_production_entry_with_movement to include product_type in stock movement
-- ============================================================

-- Update movement_type constraint to include production types
ALTER TABLE public.production_stock_movements
  DROP CONSTRAINT IF EXISTS production_stock_movements_movement_type_check;

ALTER TABLE public.production_stock_movements
  ADD CONSTRAINT production_stock_movements_movement_type_check
  CHECK (movement_type IN ('inbound', 'outbound', 'adjustment', 'production', 'sale', 'self_use'));

-- Recreate save_production_entry_with_movement with product_type in stock movement
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
    v_product_type_val,
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
      product_type,
      unit
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
      v_product_type_val,
      p_unit
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
