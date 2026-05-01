-- ============================================================
-- Secure search_unified RPC result scoping
-- ============================================================
-- search_unified runs as SECURITY DEFINER, so role/site/status checks
-- must be enforced inside the function and not rely on caller RLS.

CREATE OR REPLACE FUNCTION search_unified(
  p_query TEXT,
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  entity_type TEXT,
  entity_id UUID,
  title TEXT,
  subtitle TEXT,
  href TEXT,
  score DOUBLE PRECISION
) AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_company TEXT;
  v_site_ids UUID[];
  v_limit INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);

  IF v_user_id IS NOT NULL THEN
    SELECT role, company, site_ids
      INTO v_role, v_company, v_site_ids
    FROM workers
    WHERE id = v_user_id;
  END IF;

  IF v_role IS NULL OR NULLIF(BTRIM(COALESCE(p_query, '')), '') IS NULL THEN
    RETURN;
  END IF;

  -- Sites
  RETURN QUERY
  SELECT
    'site'::TEXT,
    s.id,
    s.name::TEXT,
    COALESCE(s.company, '')::TEXT,
    '/site/' || s.id::TEXT,
    ts_rank(
      to_tsvector('simple', s.name || ' ' || COALESCE(s.company, '')),
      plainto_tsquery('simple', p_query)
    )::DOUBLE PRECISION
  FROM sites s
  WHERE (
    v_role IN ('admin', 'site_manager')
    OR (v_role = 'partner' AND v_company IS NOT NULL AND s.allowed_companies @> ARRAY[v_company])
    OR (v_role = 'worker' AND s.id = ANY(COALESCE(v_site_ids, ARRAY[]::UUID[])))
  )
    AND (
      s.name ILIKE '%' || p_query || '%'
      OR s.company ILIKE '%' || p_query || '%'
      OR s.address ILIKE '%' || p_query || '%'
    )
  ORDER BY ts_rank(
    to_tsvector('simple', s.name || ' ' || COALESCE(s.company, '')),
    plainto_tsquery('simple', p_query)
  ) DESC
  LIMIT v_limit;

  -- Workers are admin-only.
  IF v_role = 'admin' THEN
    RETURN QUERY
    SELECT
      'worker'::TEXT,
      w.id,
      w.name::TEXT,
      (COALESCE(w.company, '') || ' / ' || COALESCE(w.role, ''))::TEXT,
      '/admin/users/' || w.id::TEXT,
      ts_rank(
        to_tsvector('simple', w.name || ' ' || COALESCE(w.email, '')),
        plainto_tsquery('simple', p_query)
      )::DOUBLE PRECISION
    FROM workers w
    WHERE w.name ILIKE '%' || p_query || '%'
       OR w.email ILIKE '%' || p_query || '%'
    ORDER BY ts_rank(
      to_tsvector('simple', w.name || ' ' || COALESCE(w.email, '')),
      plainto_tsquery('simple', p_query)
    ) DESC
    LIMIT v_limit;
  END IF;

  -- Documents. Partner users may only see approved/locked, non-personal
  -- documents on allowed company sites.
  RETURN QUERY
  SELECT
    'document'::TEXT,
    d.id,
    d.title::TEXT,
    COALESCE(d.category, '')::TEXT,
    '/documents/' || d.id::TEXT,
    ts_rank(
      to_tsvector('simple', d.title || ' ' || COALESCE(d.category, '')),
      plainto_tsquery('simple', p_query)
    )::DOUBLE PRECISION
  FROM documents d
  JOIN sites s ON s.id = d.site_id
  WHERE d.title ILIKE '%' || p_query || '%'
    AND (
      v_role IN ('admin', 'site_manager')
      OR (v_role = 'worker' AND d.uploaded_by = v_user_id)
      OR (
        v_role = 'partner'
        AND v_company IS NOT NULL
        AND s.allowed_companies @> ARRAY[v_company]
        AND (d.approval_status = 'approved' OR d.locked_at IS NOT NULL)
        AND COALESCE(d.category, '') <> '안전서류'
        AND COALESCE(d.source_type, '') <> 'worker_required_document'
      )
    )
  ORDER BY ts_rank(
    to_tsvector('simple', d.title || ' ' || COALESCE(d.category, '')),
    plainto_tsquery('simple', p_query)
  ) DESC
  LIMIT v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
