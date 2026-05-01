-- ============================================================
-- Drawing Markup Storage Schema and RLS
-- Phase 1: schema/RLS foundation for worklog drawing markup saves
--
-- This migration prepares the canonical storage table for drawing
-- markup JSON and tightens documents partner visibility for future
-- source_type='drawing_markup' documents.
--
-- This migration does not implement app save APIs, Storage upload, RPC,
-- or document registration logic.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- drawing_markups table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.drawing_markups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  worklog_id      UUID REFERENCES public.daily_logs(id) ON DELETE SET NULL,
  attachment_id   TEXT NOT NULL,
  page_no         INTEGER NOT NULL DEFAULT 1 CHECK (page_no > 0),
  original_path   TEXT,
  marked_path     TEXT,
  markup_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'locked', 'archived')),
  approval_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
  approved_by     UUID REFERENCES public.workers(id),
  approved_at     TIMESTAMPTZ,
  rejected_by     UUID REFERENCES public.workers(id),
  rejected_at     TIMESTAMPTZ,
  locked_by       UUID REFERENCES public.workers(id),
  locked_at       TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES public.workers(id),
  updated_by      UUID REFERENCES public.workers(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT drawing_markups_final_state_consistency CHECK (
    (status <> 'locked' OR locked_at IS NOT NULL)
    AND (approval_status <> 'approved' OR approved_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_drawing_markups_site_status
  ON public.drawing_markups(site_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_drawing_markups_worklog_attachment
  ON public.drawing_markups(worklog_id, attachment_id, page_no);

CREATE INDEX IF NOT EXISTS idx_drawing_markups_created_by
  ON public.drawing_markups(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_drawing_markups_approval
  ON public.drawing_markups(approval_status, locked_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_drawing_markups_active_source
  ON public.drawing_markups(site_id, COALESCE(worklog_id, '00000000-0000-0000-0000-000000000000'::uuid), attachment_id, page_no)
  WHERE status <> 'archived';

COMMENT ON TABLE public.drawing_markups IS 'Canonical drawing markup JSON records for worklog drawing attachments.';
COMMENT ON COLUMN public.drawing_markups.markup_json IS 'Canonical DrawingMarkupMark[] JSON plus optional metadata.';
COMMENT ON COLUMN public.drawing_markups.attachment_id IS 'Worklog media_info attachment id for the source drawing.';
COMMENT ON COLUMN public.drawing_markups.marked_path IS 'Generated final marked image/PDF path, populated after export/finalization.';

-- ============================================================
-- updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_drawing_markups_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_drawing_markups_updated_at ON public.drawing_markups;
CREATE TRIGGER set_drawing_markups_updated_at
  BEFORE UPDATE ON public.drawing_markups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_drawing_markups_updated_at();

-- ============================================================
-- final/locked overwrite guard
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_drawing_markup_final_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'locked' OR OLD.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Approved or locked drawing markups cannot be modified by draft save flows.';
  END IF;

  IF OLD.status = 'approved' OR OLD.approval_status = 'approved' THEN
    IF NEW.status NOT IN ('approved', 'locked')
       OR NEW.approval_status <> 'approved'
       OR NEW.site_id IS DISTINCT FROM OLD.site_id
       OR NEW.worklog_id IS DISTINCT FROM OLD.worklog_id
       OR NEW.attachment_id IS DISTINCT FROM OLD.attachment_id
       OR NEW.page_no IS DISTINCT FROM OLD.page_no
       OR NEW.original_path IS DISTINCT FROM OLD.original_path
       OR NEW.markup_json IS DISTINCT FROM OLD.markup_json THEN
      RAISE EXCEPTION 'Approved drawing markups cannot be overwritten by draft save flows.';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_drawing_markup_final_update ON public.drawing_markups;
CREATE TRIGGER prevent_drawing_markup_final_update
  BEFORE UPDATE ON public.drawing_markups
  FOR EACH ROW
  WHEN (
    OLD.status IN ('approved', 'locked')
    OR OLD.approval_status = 'approved'
    OR OLD.locked_at IS NOT NULL
  )
  EXECUTE FUNCTION public.prevent_drawing_markup_final_mutation();

DROP TRIGGER IF EXISTS prevent_drawing_markup_final_delete ON public.drawing_markups;
CREATE TRIGGER prevent_drawing_markup_final_delete
  BEFORE DELETE ON public.drawing_markups
  FOR EACH ROW
  WHEN (
    OLD.status IN ('approved', 'locked')
    OR OLD.approval_status = 'approved'
    OR OLD.locked_at IS NOT NULL
  )
  EXECUTE FUNCTION public.prevent_drawing_markup_final_mutation();

-- ============================================================
-- RLS helpers
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_access_drawing_markup_site(p_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = auth.uid()
      AND (
        w.role IN ('admin', 'site_manager')
        OR (w.role = 'worker' AND w.site_ids && ARRAY[p_site_id])
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_drawing_markup_site(p_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role IN ('admin', 'site_manager')
  );
$$;

-- ============================================================
-- drawing_markups RLS
-- ============================================================

ALTER TABLE public.drawing_markups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drawing_markups_select" ON public.drawing_markups;
CREATE POLICY "drawing_markups_select" ON public.drawing_markups
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.can_access_drawing_markup_site(site_id)
  );

DROP POLICY IF EXISTS "drawing_markups_insert" ON public.drawing_markups;
CREATE POLICY "drawing_markups_insert" ON public.drawing_markups
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND public.can_access_drawing_markup_site(site_id)
    AND status IN ('draft', 'pending')
    AND approval_status IN ('draft', 'pending')
    AND locked_at IS NULL
  );

DROP POLICY IF EXISTS "drawing_markups_update_draft" ON public.drawing_markups;
CREATE POLICY "drawing_markups_update_draft" ON public.drawing_markups
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND public.can_access_drawing_markup_site(site_id)
    AND status NOT IN ('approved', 'locked')
    AND approval_status <> 'approved'
    AND locked_at IS NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.can_access_drawing_markup_site(site_id)
    AND status NOT IN ('approved', 'locked')
    AND approval_status <> 'approved'
    AND locked_at IS NULL
  );

DROP POLICY IF EXISTS "drawing_markups_update_review" ON public.drawing_markups;
CREATE POLICY "drawing_markups_update_review" ON public.drawing_markups
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND public.can_manage_drawing_markup_site(site_id)
    AND status <> 'locked'
    AND locked_at IS NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.can_manage_drawing_markup_site(site_id)
  );

DROP POLICY IF EXISTS "drawing_markups_delete_draft" ON public.drawing_markups;
CREATE POLICY "drawing_markups_delete_draft" ON public.drawing_markups
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR public.can_manage_drawing_markup_site(site_id)
    )
    AND status NOT IN ('approved', 'locked')
    AND approval_status <> 'approved'
    AND locked_at IS NULL
  );

-- ============================================================
-- documents RLS: protect drawing markup publications like photo sheets
-- ============================================================

DROP POLICY IF EXISTS "documents_read" ON public.documents;
CREATE POLICY "documents_read" ON public.documents
FOR SELECT
USING (
  auth.uid() = uploaded_by

  OR EXISTS (
    SELECT 1
    FROM public.workers
    WHERE id = auth.uid()
      AND role IN ('admin', 'site_manager')
  )

  OR EXISTS (
    SELECT 1
    FROM public.workers w, public.sites s
    WHERE w.id = auth.uid()
      AND w.role = 'partner'
      AND s.id = documents.site_id
      AND s.allowed_companies @> ARRAY[w.company]
      AND (
        (
          COALESCE(documents.source_type, '') NOT IN ('photo_sheet', 'drawing_markup')
          AND COALESCE(documents.category, '') NOT IN ('사진대지', '도면마킹')
        )
        OR documents.approval_status = 'approved'
        OR documents.locked_at IS NOT NULL
      )
  )
);
