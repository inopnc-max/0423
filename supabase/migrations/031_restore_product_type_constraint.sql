-- ============================================================
-- Follow-up: Restore product_type constraint idempotently
--
-- Safe even if 030 already recreated the same constraint.
-- ============================================================

ALTER TABLE public.production_entries
  DROP CONSTRAINT IF EXISTS production_entries_product_type_check;

ALTER TABLE public.production_entries
  ADD CONSTRAINT production_entries_product_type_check
  CHECK (product_type IN ('npc1000', 'npc3000q', 'other'));
