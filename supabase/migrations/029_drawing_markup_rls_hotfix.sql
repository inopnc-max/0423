-- ============================================================
-- Drawing Markup RLS Hotfix
--
-- 020_drawing_markup_storage_schema.sql introduced the base table,
-- triggers, helpers, and policies. This follow-up keeps the original
-- migration immutable and tightens the contracts before the table is
-- used by B-side save hooks.
--
-- Fixes:
--   1. Avoid NEW access during DELETE trigger execution.
--   2. Limit site_manager review/manage access to assigned sites.
--   3. Limit worker draft updates to drafts created by that worker.
--   4. Restore hardened partner documents_read semantics while covering
--      future source_type='drawing_markup' documents.
-- ============================================================

-- ============================================================
-- Trigger hotfix: handle UPDATE and DELETE separately
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_drawing_markup_final_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Approved or locked drawing markups cannot be deleted.';
  END IF;

  IF OLD.status = 'locked' OR OLD.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Locked drawing markups cannot be modified.';
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

  RETURN NEW;
END;
$$;

-- ============================================================
-- RLS helper hotfix: site_manager must be assigned to the site
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
        w.role = 'admin'
        OR (w.role IN ('site_manager', 'worker') AND w.site_ids && ARRAY[p_site_id])
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
      AND (
        w.role = 'admin'
        OR (w.role = 'site_manager' AND w.site_ids && ARRAY[p_site_id])
      )
  );
$$;

-- ============================================================
-- drawing_markups policy hotfix
-- ============================================================

ALTER TABLE public.drawing_markups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drawing_markups_select" ON public.drawing_markups;
CREATE POLICY "drawing_markups_select" ON public.drawing_markups
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      public.can_manage_drawing_markup_site(site_id)
      OR created_by = auth.uid()
    )
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
    AND created_by = auth.uid()
    AND status NOT IN ('approved', 'locked')
    AND approval_status <> 'approved'
    AND locked_at IS NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
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
-- documents_read hotfix
-- ============================================================
-- Keep 018 partner hardening semantics:
--   - uploaded_by can read own documents
--   - admin/site_manager can read operational documents
--   - partner can read only approved/locked non-personal documents for
--     allowed sites
-- Future drawing markup publications are protected by the same
-- approved/locked gate through source_type='drawing_markup'.

DROP POLICY IF EXISTS "documents_read" ON public.documents;

CREATE POLICY "documents_read" ON public.documents
FOR SELECT
USING (
  auth.uid() = uploaded_by
  OR EXISTS (
    SELECT 1
    FROM public.workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager')
  )
  OR EXISTS (
    SELECT 1
    FROM public.workers w
    JOIN public.sites s ON s.id = documents.site_id
    WHERE w.id = auth.uid()
      AND w.role = 'partner'
      AND w.company IS NOT NULL
      AND s.allowed_companies @> ARRAY[w.company]
      AND (documents.approval_status = 'approved' OR documents.locked_at IS NOT NULL)
      AND COALESCE(documents.category, '') <> '안전서류'
      AND COALESCE(documents.source_type, '') NOT IN ('worker_required_document', 'salary_statement')
  )
);
