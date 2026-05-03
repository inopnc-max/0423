-- ============================================================
-- Follow-up: Make production_type constraint idempotent
--
-- 030 adds production_entries_production_type_check without DROP IF EXISTS.
-- This is a safety follow-up in case 030 was applied before the fix.
-- ============================================================

ALTER TABLE public.production_entries
  DROP CONSTRAINT IF EXISTS production_entries_production_type_check;

ALTER TABLE public.production_entries
  ADD CONSTRAINT production_entries_production_type_check
  CHECK (production_type IS NULL OR production_type IN ('생산', '판매', '자체사용', '운송비'));
