-- ============================================================
-- 생산관리 테이블 생성 (기존 production_entries 확장)
-- A-1: Supabase 마이그레이션 - 생산관리 시스템
--
-- 주의:
--   - destructive migration 금지
--   - production_entries 테이블은 이미 009에서 생성됨
--   - 새 테이블만 추가, 기존 테이블 수정 금지
-- ============================================================

-- ── products 테이블 ────────────────────────────────────────────
-- 제품 마스터

CREATE TABLE IF NOT EXISTS products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  unit           TEXT NOT NULL DEFAULT 'EA',
  unit_price     INTEGER NOT NULL DEFAULT 0,
  category       TEXT,
  safety_stock   INTEGER DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_code ON products (code);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (active, name);

-- ── product_units 테이블 ────────────────────────────────────────
-- 제품 단위 마스터

CREATE TABLE IF NOT EXISTS product_units (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  plural_name  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── production_batches 테이블 ────────────────────────────────────
-- 생산 배치 (기존 production_entries의 생산 관련 데이터 이동용)

CREATE TABLE IF NOT EXISTS production_batches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id),
  batch_date       DATE NOT NULL,
  quantity         NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit             TEXT NOT NULL DEFAULT 'EA',
  site_id          UUID REFERENCES sites(id),
  worker_id        UUID REFERENCES workers(id),
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES workers(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_batches_date
  ON production_batches (batch_date DESC);
CREATE INDEX IF NOT EXISTS idx_production_batches_product
  ON production_batches (product_id, batch_date DESC);

-- ── production_sales 테이블 ────────────────────────────────────
-- 매출

CREATE TABLE IF NOT EXISTS production_sales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id),
  sale_date        DATE NOT NULL,
  quantity         NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit_price       INTEGER NOT NULL DEFAULT 0,
  total_amount     INTEGER NOT NULL DEFAULT 0,
  client_id       UUID REFERENCES production_clients(id),
  site_id          UUID REFERENCES sites(id),
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES workers(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_sales_date
  ON production_sales (sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_production_sales_product
  ON production_sales (product_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_production_sales_client
  ON production_sales (client_id, sale_date DESC);

-- ── production_self_use 테이블 ─────────────────────────────────
-- 자체사용

CREATE TABLE IF NOT EXISTS production_self_use (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id),
  use_date         DATE NOT NULL,
  quantity         NUMERIC(10,3) NOT NULL DEFAULT 0,
  site_id          UUID REFERENCES sites(id),
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES workers(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_self_use_date
  ON production_self_use (use_date DESC);

-- ── production_transport_costs 테이블 ───────────────────────────
-- 운송비

CREATE TABLE IF NOT EXISTS production_transport_costs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_date        DATE NOT NULL,
  transport_type    TEXT NOT NULL,
  amount           INTEGER NOT NULL DEFAULT 0,
  vehicle_number    TEXT,
  site_id          UUID REFERENCES sites(id),
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES workers(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_transport_costs_date
  ON production_transport_costs (cost_date DESC);

-- ── production_stock_movements 테이블 ──────────────────────────
-- 재고 이동 원장 (핵심 - 모든 입출고 기록)

CREATE TABLE IF NOT EXISTS production_stock_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id),
  movement_date     DATE NOT NULL,
  movement_type    TEXT NOT NULL
    CHECK (movement_type IN (
      'production',    -- 생산 입고
      'purchase',       -- 구매 입고
      'return_in',     -- 반품 입고
      'sale',          -- 판매 출고
      'self_use',     -- 자체사용 출고
      'return_out',    -- 반품 출고
      'adjustment_in', -- 재고조정 입고
      'adjustment_out' -- 재고조정 출고
    )),
  quantity         NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit_price       INTEGER DEFAULT 0,
  source_table     TEXT,
  source_id        UUID,
  site_id          UUID REFERENCES sites(id),
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES workers(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_stock_movements_product
  ON production_stock_movements (product_id, movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_production_stock_movements_type
  ON production_stock_movements (movement_type, movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_production_stock_movements_date
  ON production_stock_movements (movement_date DESC);

-- ── production_inventory_snapshots 테이블 ─────────────────────
-- 재고 스냅샷 (월말 재고 기록)

CREATE TABLE IF NOT EXISTS production_inventory_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_month   TEXT NOT NULL,
  product_id       UUID NOT NULL REFERENCES products(id),
  quantity         NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit_price       INTEGER DEFAULT 0,
  total_amount     INTEGER DEFAULT 0,
  created_by       UUID NOT NULL REFERENCES workers(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (snapshot_month, product_id)
);

CREATE INDEX IF NOT EXISTS idx_production_inventory_snapshots_month
  ON production_inventory_snapshots (snapshot_month DESC);

-- ── production_clients 테이블 ──────────────────────────────────
-- 거래처 마스터

CREATE TABLE IF NOT EXISTS production_clients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT UNIQUE,
  name           TEXT NOT NULL,
  contact_name   TEXT,
  contact_phone  TEXT,
  address        TEXT,
  notes          TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_clients_active
  ON production_clients (active, name);

-- ── production_settings 테이블 ──────────────────────────────────
-- 생산설정 (안전재고, 기본 단가 등)

CREATE TABLE IF NOT EXISTS production_settings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key    TEXT NOT NULL UNIQUE,
  setting_value  JSONB NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Comments ─────────────────────────────────────────────────

COMMENT ON TABLE products                      IS '제품 마스터 - 제품코드, 제품명, 단위, 단가, 안전재고';
COMMENT ON TABLE product_units                IS '제품 단위 마스터';
COMMENT ON TABLE production_batches           IS '생산 배치 - 생산량 기록';
COMMENT ON TABLE production_sales             IS '매출 - 판매 내역';
COMMENT ON TABLE production_self_use          IS '자체사용 - 사내 사용 내역';
COMMENT ON TABLE production_transport_costs   IS '운송비 - 운송비 내역';
COMMENT ON TABLE production_stock_movements  IS '재고 이동 원장 - 모든 입출고 기록 (재고 계산의 기준)';
COMMENT ON TABLE production_inventory_snapshots IS '재고 스냅샷 - 월말 재고 기록';
COMMENT ON TABLE production_clients           IS '거래처 마스터';
COMMENT ON TABLE production_settings          IS '생산설정 - 안전재고, 기본 단가 등 키-값 설정';
