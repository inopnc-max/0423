-- ============================================================
-- Drop Previously Invalid Production RPC Functions
--
-- These functions were created with a schema that doesn't match
-- the production database (missing columns like product_id,
-- source_table, source_id, etc.). They must be dropped before
-- recreating with the correct schema.
--
-- Drops:
--   - save_production_entry_with_movement (wrong signature)
--   - update_production_entry_with_movement (wrong signature)
--   - delete_production_entry_with_movement (wrong signature)
--   - audit_missing_stock_movements (wrong signature)
--   - audit_missing_movement_summary (wrong signature)
--   - dry_run_backfill_stock_movement (wrong signature)
--   - backfill_single_stock_movement (wrong signature)
-- ============================================================

DROP FUNCTION IF EXISTS public.save_production_entry_with_movement(DATE, TEXT, UUID, TEXT, NUMERIC, UUID, TEXT, INTEGER, UUID, TEXT);
DROP FUNCTION IF EXISTS public.save_production_entry_with_movement(DATE, TEXT, UUID, TEXT, NUMERIC, UUID, TEXT, INTEGER, UUID, TEXT, UUID);

DROP FUNCTION IF EXISTS public.update_production_entry_with_movement(UUID, DATE, TEXT, UUID, TEXT, NUMERIC, UUID, TEXT, INTEGER, UUID, TEXT);

DROP FUNCTION IF EXISTS public.delete_production_entry_with_movement(UUID);

DROP FUNCTION IF EXISTS public.audit_missing_stock_movements();
DROP FUNCTION IF EXISTS public.audit_missing_movement_summary();

DROP FUNCTION IF EXISTS public.dry_run_backfill_stock_movement(UUID);
DROP FUNCTION IF EXISTS public.backfill_single_stock_movement(UUID);
