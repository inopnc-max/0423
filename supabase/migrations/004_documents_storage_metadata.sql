-- ============================================================
-- documents 테이블 Storage metadata 추가
-- Supabase Storage private bucket 전환을 위한 additive migration
--
-- 추가 컬럼:
--   - storage_bucket: Storage bucket 이름 (예: reports, documents)
--   - storage_path:   Storage 내 파일 경로
--   - source_type:    문서 출처 유형 (예: photo_sheet, worklog, upload)
--   - source_id:      출처 레코드 ID (예: daily_logs.id, photo_sheet_drafts.id)
--
-- 용도: signed URL preview/download 및 Storage 파일 관리
--
-- 주의:
--   - 기존 file_url 필드는 유지 (public bucket 호환 + fallback)
--   - 모든 컬럼은 nullable (기존 데이터 영향 없음)
--   - NOT NULL 제약 없음
--   - 기존 데이터 backfill 없음
-- ============================================================

-- ── Add metadata columns ─────────────────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_bucket text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_id text;

-- ── Add indexes ───────────────────────────────────────────────
-- storage_bucket + storage_path 조합 인덱스 (signed URL 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_documents_storage_path
  ON documents (storage_bucket, storage_path);

-- source_type + source_id 조합 인덱스 (문서 출처 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_documents_source
  ON documents (source_type, source_id);

-- ── Comment ───────────────────────────────────────────────────
COMMENT ON COLUMN documents.storage_bucket IS 'Storage bucket name (e.g., reports, documents)';
COMMENT ON COLUMN documents.storage_path   IS 'File path within the bucket';
COMMENT ON COLUMN documents.source_type   IS 'Document source type (e.g., photo_sheet, worklog, upload)';
COMMENT ON COLUMN documents.source_id     IS 'Source record ID (e.g., daily_logs.id, photo_sheet_drafts.id)';
