-- ═══════════════════════════════════════════════════════════════════
-- Production Manager Role 및 생산관리 테이블 추가
-- ═══════════════════════════════════════════════════════════════════

-- 1. production_entries 테이블: 생산 입력 데이터
CREATE TABLE IF NOT EXISTS production_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  product_type text NOT NULL CHECK (product_type IN ('npc1000', 'npc3000q', 'other')),
  quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'ea',
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. production_expenses 테이블: 운송비, 자체사용, 판매 등
CREATE TABLE IF NOT EXISTS production_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  expense_type text NOT NULL CHECK (expense_type IN ('transport', 'self_use', 'sales')),
  amount integer NOT NULL DEFAULT 0,
  description text,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. RLS 활성화
ALTER TABLE production_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_expenses ENABLE ROW LEVEL SECURITY;

-- 4. production_entries RLS 정책
CREATE POLICY "production_entries_access_policy"
ON production_entries
FOR ALL
TO authenticated
USING (
  -- 본인 데이터 접근
  user_id = auth.uid()
  -- production_manager 또는 admin 역할 확인
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('production_manager', 'admin')
  )
)
WITH CHECK (
  -- production_manager 또는 admin만 생성/수정 가능
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('production_manager', 'admin')
  )
);

-- 5. production_expenses RLS 정책
CREATE POLICY "production_expenses_access_policy"
ON production_expenses
FOR ALL
TO authenticated
USING (
  -- 본인 데이터 접근
  user_id = auth.uid()
  -- production_manager 또는 admin 역할 확인
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('production_manager', 'admin')
  )
)
WITH CHECK (
  -- production_manager 또는 admin만 생성/수정 가능
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('production_manager', 'admin')
  )
);

-- 6. 인덱스 생성
CREATE INDEX idx_production_entries_user_date ON production_entries(user_id, entry_date);
CREATE INDEX idx_production_entries_product ON production_entries(product_type);
CREATE INDEX idx_production_expenses_user_date ON production_expenses(user_id, expense_date);
CREATE INDEX idx_production_expenses_type ON production_expenses(expense_type);

-- 7. updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. 트리거 설정
DROP TRIGGER IF EXISTS update_production_entries_updated_at ON production_entries;
CREATE TRIGGER update_production_entries_updated_at
  BEFORE UPDATE ON production_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_production_expenses_updated_at ON production_expenses;
CREATE TRIGGER update_production_expenses_updated_at
  BEFORE UPDATE ON production_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
