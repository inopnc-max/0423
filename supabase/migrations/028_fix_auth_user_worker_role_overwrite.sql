-- Migration: 028_fix_auth_user_worker_role_overwrite.sql
-- Fix: Prevent handle_new_user trigger from overwriting existing worker roles
-- Date: 2026-05-02

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new handle_new_user function that preserves existing worker roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new worker, but if the id already exists, only update email/name/updated_at
  -- IMPORTANT: role is NOT updated to preserve manually assigned roles (admin, production_manager, etc.)
  INSERT INTO public.workers (
    id,
    email,
    name,
    role,
    company,
    phone,
    daily,
    site_ids,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'worker'),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    NEW.raw_user_meta_data->>'phone',
    CASE
      WHEN (NEW.raw_user_meta_data->>'daily') ~ '^[0-9]+$'
        THEN (NEW.raw_user_meta_data->>'daily')::integer
      ELSE 150000
    END,
    CASE
      WHEN jsonb_typeof(NEW.raw_user_meta_data->'site_ids') = 'array' THEN
        COALESCE(
          (
            SELECT array_agg(value::uuid)
            FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'site_ids') AS value
          ),
          '{}'
        )::uuid[]
      ELSE '{}'::uuid[]
    END,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    company = EXCLUDED.company,
    phone = EXCLUDED.phone,
    daily = EXCLUDED.daily,
    site_ids = EXCLUDED.site_ids,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
    -- NOTE: role is intentionally NOT updated to protect manually assigned roles

  RETURN NEW;
END;
$$;

-- Recreate trigger (idempotent)
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
