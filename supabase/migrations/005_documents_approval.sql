-- ============================================================
-- documents 테이블 승인/잠금 metadata 추가
-- PR #36: admin documents 사진대지 승인 UI 1차 구현
--
-- 추가 컬럼 (nullable, additive only):
--   - approval_status: 승인 상태 (pending, approved, rejected)
--   - approved_at: 승인 일시
--   - approved_by: 승인자 ID
--   - locked_at: 잠금 일시
--   - locked_by: 잠금자 ID
--
-- 용도: 사진대지 최종본 승인/잠금 상태 관리
--
-- 주의:
--   - 기존 데이터 영향 없음 (nullable, no backfill)
--   - CHECK constraint 없음 (문자열Validation은 client-side)
--   - 기존 documents file_url/storage_bucket/storage_path 유지
-- ============================================================

-- ── Add approval/lock metadata columns ─────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approval_status text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS locked_by text;

-- ── Add index for photo sheet approval queries ─────────────────
-- source_type + approval_status + site_id + created_at 조합 인덱스
-- 사진대지 문서 승인 상태 조회 최적화
CREATE INDEX IF NOT EXISTS idx_documents_photo_sheet_approval
  ON documents (source_type, approval_status, site_id, created_at);

-- ── Comments ───────────────────────────────────────────────────
COMMENT ON COLUMN documents.approval_status IS '승인 상태: pending, approved, rejected';
COMMENT ON COLUMN documents.approved_at    IS '승인 일시';
COMMENT ON COLUMN documents.approved_by    IS '승인자 worker ID';
COMMENT ON COLUMN documents.locked_at      IS '최종본 잠금 일시';
COMMENT ON COLUMN documents.locked_by      IS '잠금자 worker ID';
