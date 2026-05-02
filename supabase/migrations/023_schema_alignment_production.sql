-- ============================================================
-- Schema Alignment Migration
-- Phase A: Add missing columns for stock movement integration
--
-- This migration adds columns required by 021/022 RPC functions:
--   - production_entries: product_id, product_name, work_date, production_type, 
--                        created_by, amount, memo, source_table, source_id
--   - production_stock_movements: product_id, movement_date, unit_price, 
--                                  source_table, source_id
-- ============================================================

-- ── production_entries additions ────────────────────────────
ALTER TABLE public.production_entries
  ADD COLUMN IF NOT EXISTS product_id UUID;

ALTER TABLE public.production_entries
  ADD COLUMN IF NOT EXISTS product_name TEXT;

ALTER TABLE public.production_entries
  ADD COLUMN IF NOT EXISTS work_date DATE;

ALTER TABLE public.production_entries
  ADD COLUMN IF NOT EXISTS production_type TEXT;

ALTER TABLE public.production_entries
  ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE public.production_entries
  ADD COLUMN IF NOT EXISTS amount INTEGER DEFAULT 0;

ALTER TABLE public.production_entries
  ADD COLUMN IF NOT EXISTS memo TEXT;

ALTER TABLE public.production_entries
  ADD COLUMN IF NOT EXISTS source_table TEXT;

ALTER TABLE public.production_entries
  ADD COLUMN IF NOT EXISTS source_id UUID;

-- ── production_stock_movements additions ───────────────────
ALTER TABLE public.production_stock_movements
  ADD COLUMN IF NOT EXISTS product_id UUID;

ALTER TABLE public.production_stock_movements
  ADD COLUMN IF NOT EXISTS movement_date DATE;

ALTER TABLE public.production_stock_movements
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0;

ALTER TABLE public.production_stock_movements
  ADD COLUMN IF NOT EXISTS source_table TEXT;

ALTER TABLE public.production_stock_movements
  ADD COLUMN IF NOT EXISTS source_id UUID;
