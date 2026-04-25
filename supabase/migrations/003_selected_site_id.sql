-- ============================================================
-- INOPNC Migration: selected_site_id support
-- PR 2: selectedSiteId 공통 상태 기반
-- additive only — 기존 last_site_id 호환 유지
-- ============================================================

-- selected_site_id 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE user_ui_state
  ADD COLUMN IF NOT EXISTS selected_site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

-- selected_site_id 인덱스 (접근 속도 최적화)
CREATE INDEX IF NOT EXISTS idx_user_ui_state_selected_site
  ON user_ui_state(selected_site_id)
  WHERE selected_site_id IS NOT NULL;

-- Trigger: selected_site_id 갱신 시 updated_at 자동 갱신
-- (이미 update_updated_at_column trigger가 있으므로 별도 trigger 불필요)

-- RLS 확인: selected_site_id는 user_ui_state RLS (auth.uid() = user_id)로 보호됨
-- 기존 RLS 정책은 변경 없음 — 읽기/쓰기 모두 현재 사용자만 접근 가능
