-- ============================================================
-- Production Stock Movement RPC Functions
-- Phase 1: RPC helper functions for stock movement recording
--
-- These functions are used by the app layer to record stock
-- movements when production entries are saved/updated/deleted.
--
-- Phase 2 will wire these functions to productionRecords.ts
-- ============================================================

-- ── record_production_stock_movement ─────────────────────────
-- Records a stock movement for production entries.
-- Returns the movement record id on success.
--
-- Parameters:
--   p_product_id       UUID    - FK to products.id
--   p_movement_date    DATE    - Date of the movement
--   p_movement_type    TEXT    - 'production', 'sale', 'self_use'
--   p_quantity         NUMERIC - Movement quantity
--   p_unit_price       INTEGER - Unit price (default 0)
--   p_source_table     TEXT    - Source table name (e.g., 'production_entries')
--   p_source_id        UUID    - Source record id
--   p_site_id          UUID    - Site id (optional)
--   p_created_by       UUID    - Worker id
--   p_notes            TEXT    - Notes (optional)

CREATE OR REPLACE FUNCTION public.record_production_stock_movement(
  p_product_id       UUID,
  p_movement_date    DATE,
  p_movement_type    TEXT,
  p_quantity         NUMERIC(10,3),
  p_unit_price       INTEGER DEFAULT 0,
  p_source_table     TEXT,
  p_source_id        UUID,
  p_site_id          UUID DEFAULT NULL,
  p_created_by       UUID,
  p_notes            TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_movement_id UUID;
BEGIN
  -- Validate movement_type
  IF p_movement_type NOT IN ('production', 'sale', 'self_use') THEN
    RAISE EXCEPTION 'Invalid movement_type: %', p_movement_type;
  END IF;

  -- Validate quantity
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive: %', p_quantity;
  END IF;

  -- Insert the movement record
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
    p_movement_date,
    p_movement_type,
    p_quantity,
    p_unit_price,
    p_source_table,
    p_source_id,
    p_site_id,
    p_created_by,
    p_notes
  )
  RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$;

-- ── reverse_production_stock_movement ───────────────────────
-- Reverses (deletes) stock movements for a given source.
-- Used when a production entry is deleted or updated.
--
-- Parameters:
--   p_source_table TEXT - Source table name
--   p_source_id    UUID - Source record id

CREATE OR REPLACE FUNCTION public.reverse_production_stock_movement(
  p_source_table TEXT,
  p_source_id    UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.production_stock_movements
  WHERE source_table = p_source_table
    AND source_id = p_source_id;
END;
$$;

-- ── get_stock_movement_by_source ────────────────────────────
-- Retrieves stock movements for a given source record.
-- Useful for checking if a movement already exists.
--
-- Parameters:
--   p_source_table TEXT - Source table name
--   p_source_id    UUID - Source record id

CREATE OR REPLACE FUNCTION public.get_stock_movement_by_source(
  p_source_table TEXT,
  p_source_id    UUID
)
RETURNS TABLE (
  id             UUID,
  product_id     UUID,
  movement_date  DATE,
  movement_type  TEXT,
  quantity       NUMERIC(10,3),
  unit_price     INTEGER,
  source_table   TEXT,
  source_id      UUID,
  site_id        UUID,
  created_by     UUID,
  notes          TEXT,
  created_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.product_id,
    m.movement_date,
    m.movement_type,
    m.quantity,
    m.unit_price,
    m.source_table,
    m.source_id,
    m.site_id,
    m.created_by,
    m.notes,
    m.created_at
  FROM public.production_stock_movements m
  WHERE m.source_table = p_source_table
    AND m.source_id = p_source_id;
END;
$$;

-- ── upsert_production_stock_movement ───────────────────────
-- Upserts a stock movement for a given source.
-- If a movement exists for the source, update it.
-- If not, insert a new one.
-- Used when updating a production entry.
--
-- Parameters: Same as record_production_stock_movement

CREATE OR REPLACE FUNCTION public.upsert_production_stock_movement(
  p_product_id       UUID,
  p_movement_date    DATE,
  p_movement_type    TEXT,
  p_quantity         NUMERIC(10,3),
  p_unit_price       INTEGER DEFAULT 0,
  p_source_table     TEXT,
  p_source_id        UUID,
  p_site_id          UUID DEFAULT NULL,
  p_created_by       UUID,
  p_notes            TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_movement_id UUID;
BEGIN
  -- Check if movement already exists for this source
  SELECT id INTO v_existing_id
  FROM public.production_stock_movements
  WHERE source_table = p_source_table
    AND source_id = p_source_id;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing movement
    UPDATE public.production_stock_movements
    SET
      product_id     = p_product_id,
      movement_date   = p_movement_date,
      movement_type  = p_movement_type,
      quantity       = p_quantity,
      unit_price     = p_unit_price,
      site_id        = p_site_id,
      notes          = p_notes
    WHERE id = v_existing_id
    RETURNING id INTO v_movement_id;
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
      p_movement_date,
      p_movement_type,
      p_quantity,
      p_unit_price,
      p_source_table,
      p_source_id,
      p_site_id,
      p_created_by,
      p_notes
    )
    RETURNING id INTO v_movement_id;
  END IF;

  RETURN v_movement_id;
END;
$$;
