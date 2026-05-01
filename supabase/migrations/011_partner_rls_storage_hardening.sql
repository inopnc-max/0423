-- ============================================================
-- Partner RLS / Storage hardening
-- ============================================================
-- Keep app-level readonly behavior backed by database policies.
-- Partner users should not be able to read personal documents, salary,
-- draft/pre-approval operational data, or arbitrary report files by
-- querying Supabase directly.

-- Documents: partner can read only approved/locked non-personal documents
-- for sites allowed to the partner company.
DROP POLICY IF EXISTS "documents_read" ON documents;

CREATE POLICY "documents_read" ON documents
FOR SELECT
USING (
  auth.uid() = uploaded_by
  OR EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager')
  )
  OR EXISTS (
    SELECT 1
    FROM workers w
    JOIN sites s ON s.id = documents.site_id
    WHERE w.id = auth.uid()
      AND w.role = 'partner'
      AND w.company IS NOT NULL
      AND s.allowed_companies @> ARRAY[w.company]
      AND (documents.approval_status = 'approved' OR documents.locked_at IS NOT NULL)
      AND COALESCE(documents.category, '') <> '안전서류'
      AND COALESCE(documents.source_type, '') <> 'worker_required_document'
  )
);

DROP POLICY IF EXISTS "documents_write" ON documents;

CREATE POLICY "documents_write" ON documents
FOR ALL
USING (
  (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1
      FROM workers
      WHERE workers.id = auth.uid()
        AND workers.role = 'worker'
    )
  )
  OR EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager')
  )
)
WITH CHECK (
  (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1
      FROM workers
      WHERE workers.id = auth.uid()
        AND workers.role = 'worker'
    )
  )
  OR EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager')
  )
);

-- Daily logs: raw worklogs may contain worker arrays, draft/pending data,
-- material details, and other internal fields. Partner report UX should use
-- approved/locked document records instead of raw daily_logs rows.
DROP POLICY IF EXISTS "daily_logs_read" ON daily_logs;

CREATE POLICY "daily_logs_read" ON daily_logs
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager')
  )
);

-- Photos are raw site media. Partner should receive approved report/document
-- artifacts only, not the raw photos table.
DROP POLICY IF EXISTS "photos_read" ON photos;

CREATE POLICY "photos_read" ON photos
FOR SELECT
USING (
  auth.uid() = uploaded_by
  OR EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager')
  )
);

-- Material logs can reveal operational quantities before review. Keep them
-- internal to worker/site_manager/admin flows.
DROP POLICY IF EXISTS "material_logs_read" ON material_logs;

CREATE POLICY "material_logs_read" ON material_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager', 'worker')
  )
);

-- Issues may include internal remediation notes and photos. Keep direct table
-- reads internal until a sanitized partner-facing report surface exists.
DROP POLICY IF EXISTS "issues_read" ON issues;

CREATE POLICY "issues_read" ON issues
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager')
  )
);

-- Billing docs should not be globally readable. Partner billing UX can be
-- reintroduced later with explicit approved/shareable status rules.
DROP POLICY IF EXISTS "billing_docs_read" ON billing_docs;

CREATE POLICY "billing_docs_read" ON billing_docs
FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager')
  )
);

-- Reports storage: authenticated users should not be able to create signed
-- URLs for arbitrary reports bucket paths. Read access is tied to the
-- documents table and mirrors the partner-safe document rules above.
DROP POLICY IF EXISTS "reports_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "reports_select_document_scoped" ON storage.objects;

CREATE POLICY "reports_select_document_scoped"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports'
  AND (
    EXISTS (
      SELECT 1
      FROM workers
      WHERE workers.id = auth.uid()
        AND workers.role IN ('admin', 'site_manager')
    )
    OR EXISTS (
      SELECT 1
      FROM documents d
      JOIN workers w ON w.id = auth.uid()
      WHERE d.storage_bucket = 'reports'
        AND d.storage_path = storage.objects.name
        AND d.uploaded_by = auth.uid()
        AND w.role IN ('admin', 'site_manager', 'worker')
    )
    OR EXISTS (
      SELECT 1
      FROM documents d
      JOIN sites s ON s.id = d.site_id
      JOIN workers w ON w.id = auth.uid()
      WHERE d.storage_bucket = 'reports'
        AND d.storage_path = storage.objects.name
        AND w.role = 'partner'
        AND w.company IS NOT NULL
        AND s.allowed_companies @> ARRAY[w.company]
        AND (d.approval_status = 'approved' OR d.locked_at IS NOT NULL)
        AND COALESCE(d.category, '') <> '안전서류'
        AND COALESCE(d.source_type, '') <> 'worker_required_document'
    )
  )
);

-- Reports writes remain available to operational roles that generate reports.
-- Partner accounts are explicitly excluded.
DROP POLICY IF EXISTS "reports_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "reports_insert_operational" ON storage.objects;

CREATE POLICY "reports_insert_operational"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports'
  AND EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager', 'worker')
  )
);

DROP POLICY IF EXISTS "reports_update_operational" ON storage.objects;

CREATE POLICY "reports_update_operational"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports'
  AND EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager', 'worker')
  )
)
WITH CHECK (
  bucket_id = 'reports'
  AND EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role IN ('admin', 'site_manager', 'worker')
  )
);
