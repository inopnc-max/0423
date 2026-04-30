CREATE TABLE public.production_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  work_date date NOT NULL,
  product_name text NOT NULL,
  production_type text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '개',
  amount integer NOT NULL DEFAULT 0,
  memo text,
  created_by uuid NOT NULL REFERENCES public.workers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_entries_type_check
    CHECK (production_type IN ('생산', '판매', '자체사용', '운송비')),
  CONSTRAINT production_entries_quantity_check
    CHECK (quantity >= 0),
  CONSTRAINT production_entries_amount_check
    CHECK (amount >= 0)
);

CREATE INDEX idx_production_entries_site_date
  ON public.production_entries (site_id, work_date DESC);

CREATE INDEX idx_production_entries_type_date
  ON public.production_entries (production_type, work_date DESC);

CREATE INDEX idx_production_entries_created_by
  ON public.production_entries (created_by, created_at DESC);

ALTER TABLE public.production_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "production_entries_select_admin_or_manager"
ON public.production_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role IN ('admin', 'production_manager')
  )
);

CREATE POLICY "production_entries_insert_admin_or_manager"
ON public.production_entries
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role IN ('admin', 'production_manager')
  )
);

CREATE POLICY "production_entries_update_admin"
ON public.production_entries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role = 'admin'
  )
);

CREATE POLICY "production_entries_update_own_manager"
ON public.production_entries
FOR UPDATE
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role = 'production_manager'
  )
)
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role = 'production_manager'
  )
);

CREATE POLICY "production_entries_delete_admin"
ON public.production_entries
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = auth.uid()
      AND w.role = 'admin'
  )
);

CREATE TRIGGER update_production_entries_updated_at
BEFORE UPDATE ON public.production_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
