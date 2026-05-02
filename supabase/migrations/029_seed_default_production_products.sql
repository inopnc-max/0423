-- Migration: 029_seed_default_production_products.sql
-- Seed default production products for production entry form
-- Non-destructive, idempotent, handles missing products table
-- Date: 2026-05-02

-- Step 1: Create products table if not exists
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'EA',
  unit_price integer NOT NULL DEFAULT 0,
  category text,
  safety_stock integer DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products (code);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (active, name);

-- Step 3: Enable RLS before creating policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies (DROP + CREATE for idempotency)
-- products_select policy
DROP POLICY IF EXISTS products_select ON public.products;
CREATE POLICY products_select ON public.products
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workers w
      WHERE w.id = auth.uid()
        AND w.role IN ('admin', 'production_manager')
    )
  );

-- products_insert policy
DROP POLICY IF EXISTS products_insert ON public.products;
CREATE POLICY products_insert ON public.products
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workers w
      WHERE w.id = auth.uid()
        AND w.role IN ('admin', 'production_manager')
    )
  );

-- products_update policy
DROP POLICY IF EXISTS products_update ON public.products;
CREATE POLICY products_update ON public.products
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workers w
      WHERE w.id = auth.uid()
        AND w.role IN ('admin', 'production_manager')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workers w
      WHERE w.id = auth.uid()
        AND w.role IN ('admin', 'production_manager')
    )
  );

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;

-- Step 6: Seed default production products (direct INSERT, idempotent)
INSERT INTO public.products (code, name, unit, unit_price, category, active)
VALUES
  ('NPC-1000', 'NPC-1000', 'EA', 0, '생산품', true),
  ('NPC-3000Q', 'NPC-3000Q', 'EA', 0, '생산품', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  unit = EXCLUDED.unit,
  unit_price = EXCLUDED.unit_price,
  category = EXCLUDED.category,
  active = true,
  updated_at = NOW();
