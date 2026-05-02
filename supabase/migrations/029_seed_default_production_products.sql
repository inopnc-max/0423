-- Migration: 029_seed_default_production_products.sql
-- Seed default production products for production entry form
-- Non-destructive, idempotent, handles missing products table
-- Date: 2026-05-02

-- Step 1: Create products table if not exists ( idempotent )
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

-- Step 2: Add unique constraint on code if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_code_key'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_code_key UNIQUE (code);
  END IF;
END $$;

-- Step 3: Create SECURITY DEFINER function to seed products (bypasses RLS)
CREATE OR REPLACE FUNCTION public.seed_production_products()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$;

-- Step 4: Execute seed
SELECT public.seed_production_products();

-- Step 5: Grant usage to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_production_products() TO authenticated;

-- Step 6: Add RLS policies if not exist (uses EXISTS pattern, no auth.is_admin())
DO $$
BEGIN
  -- products_select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
    AND tablename = 'products' AND policyname = 'products_select'
  ) THEN
    CREATE POLICY products_select ON public.products
      FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.workers w
          WHERE w.id = auth.uid()
          AND w.role = ANY (ARRAY['admin', 'production_manager'])
        )
      );
  END IF;

  -- products_insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
    AND tablename = 'products' AND policyname = 'products_insert'
  ) THEN
    CREATE POLICY products_insert ON public.products
      FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.workers w
          WHERE w.id = auth.uid()
          AND w.role = ANY (ARRAY['admin', 'production_manager'])
        )
      );
  END IF;

  -- products_update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
    AND tablename = 'products' AND policyname = 'products_update'
  ) THEN
    CREATE POLICY products_update ON public.products
      FOR UPDATE USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.workers w
          WHERE w.id = auth.uid()
          AND w.role = ANY (ARRAY['admin', 'production_manager'])
        )
      );
  END IF;
END $$;

-- Step 7: Enable RLS on products if not enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public'
    AND tablename = 'products' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
