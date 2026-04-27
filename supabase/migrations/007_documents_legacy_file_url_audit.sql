-- ============================================================
-- documents 테이블 legacy file_url 문서 조사
-- PR #44: legacy file_url audit 및 backfill 사전설계
--
-- 목적:
--   reports bucket private 전환 전에 documents 테이블에
--   storage_bucket/storage_path 없이 file_url만 있는 legacy 문서가
--   얼마나 있는지 확인하고, file_url에서 bucket/path를 복원할 수 있는지 분석합니다.
--
-- 주의:
--   이 파일은 SELECT 문과 주석만 포함합니다.
--   실제 UPDATE, DELETE, ALTER TABLE, CREATE POLICY, DROP POLICY는 포함하지 않습니다.
--   실제 backfill UPDATE는 다음 PR에서 별도로 실행합니다.
--
-- 실행 방법:
--   Supabase SQL Editor에서 이 파일의 SELECT 문만 실행하여 결과를 확인하세요.
--   UPDATE 문은 주석 처리되어 있어 실행되지 않습니다.
-- ============================================================

-- ── 1. legacy file_url only 문서 수량 확인 ───────────────────────
-- storage metadata 없이 file_url만 있는 legacy 문서 수량

SELECT
  'legacy_file_url_only' AS category,
  COUNT(*) AS count
FROM documents
WHERE file_url IS NOT NULL
  AND (storage_bucket IS NULL OR storage_path IS NULL);

-- ── 2. 전체 문서 대비 legacy 비율 확인 ──────────────────────────

SELECT
  (SELECT COUNT(*) FROM documents WHERE file_url IS NOT NULL AND (storage_bucket IS NULL OR storage_path IS NULL)) AS legacy_count,
  (SELECT COUNT(*) FROM documents WHERE file_url IS NOT NULL AND storage_bucket IS NOT NULL AND storage_path IS NOT NULL) AS modern_count,
  (SELECT COUNT(*) FROM documents) AS total_count,
  ROUND(
    (SELECT COUNT(*) FROM documents WHERE file_url IS NOT NULL AND (storage_bucket IS NULL OR storage_path IS NULL))::NUMERIC
    / NULLIF((SELECT COUNT(*) FROM documents), 0) * 100,
    2
  ) AS legacy_percentage;

-- ── 3. bucket별 public URL 패턴 확인 ────────────────────────────
-- file_url에서 bucket 후보를 추출하여 분포 확인

SELECT
  CASE
    WHEN file_url LIKE '%/storage/v1/object/public/reports/%' THEN 'reports'
    WHEN file_url LIKE '%/storage/v1/object/public/documents/%' THEN 'documents'
    WHEN file_url LIKE '%/storage/v1/object/public/photos/%' THEN 'photos'
    WHEN file_url LIKE '%/storage/v1/object/public/drawings/%' THEN 'drawings'
    ELSE 'unknown'
  END AS inferred_bucket,
  COUNT(*) AS count
FROM documents
WHERE file_url IS NOT NULL
  AND (storage_bucket IS NULL OR storage_path IS NULL)
GROUP BY inferred_bucket
ORDER BY count DESC;

-- ── 4. legacy 문서 category별 분포 ──────────────────────────────

SELECT
  category,
  COUNT(*) AS count
FROM documents
WHERE file_url IS NOT NULL
  AND (storage_bucket IS NULL OR storage_path IS NULL)
GROUP BY category
ORDER BY count DESC;

-- ── 5. legacy 문서 approval_status 분포 ────────────────────────

SELECT
  COALESCE(approval_status, 'NULL') AS approval_status,
  COUNT(*) AS count
FROM documents
WHERE file_url IS NOT NULL
  AND (storage_bucket IS NULL OR storage_path IS NULL)
GROUP BY approval_status
ORDER BY count DESC;

-- ── 6. legacy 문서 locked_at 분포 ───────────────────────────────

SELECT
  CASE WHEN locked_at IS NOT NULL THEN 'locked' ELSE 'not_locked' END AS locked_status,
  COUNT(*) AS count
FROM documents
WHERE file_url IS NOT NULL
  AND (storage_bucket IS NULL OR storage_path IS NULL)
GROUP BY CASE WHEN locked_at IS NOT NULL THEN 'locked' ELSE 'not_locked' END
ORDER BY count DESC;

-- ── 7. reports legacy 문서 샘플 확인 ───────────────────────────
-- storage_bucket IS NULL이면서 file_url에 reports가 포함된 문서

SELECT
  id,
  site_id,
  category,
  title,
  file_url,
  storage_bucket,
  storage_path,
  source_type,
  source_id,
  approval_status,
  locked_at,
  created_at
FROM documents
WHERE file_url LIKE '%/storage/v1/object/public/reports/%'
  AND (storage_bucket IS NULL OR storage_path IS NULL)
ORDER BY created_at DESC
LIMIT 20;

-- ── 8. documents legacy 문서 샘플 확인 ──────────────────────────
-- storage_bucket IS NULL이면서 file_url에 documents가 포함된 문서

SELECT
  id,
  site_id,
  category,
  title,
  file_url,
  storage_bucket,
  storage_path,
  source_type,
  source_id,
  created_at
FROM documents
WHERE file_url LIKE '%/storage/v1/object/public/documents/%'
  AND (storage_bucket IS NULL OR storage_path IS NULL)
ORDER BY created_at DESC
LIMIT 10;

-- ── 9. path 추출 가능성 확인 (reports) ─────────────────────────
-- reports public URL에서 storage_path를 복원할 수 있는지 확인

SELECT
  id,
  file_url,
  -- storage_path 추출: public URL prefix 이후의 경로
  regexp_replace(
    file_url,
    '^.*\/storage\/v1\/object\/public\/reports\/',
    ''
  ) AS inferred_storage_path,
  -- 유효한 path인지 확인 (확장자 포함 여부)
  CASE
    WHEN regexp_replace(
      file_url,
      '^.*\/storage\/v1\/object\/public\/reports\/',
      ''
    ) ~ '\.(pdf|jpg|jpeg|png|gif|doc|docx|xls|xlsx)$'
    THEN 'valid_path'
    ELSE 'invalid_path'
  END AS path_validation
FROM documents
WHERE file_url LIKE '%/storage/v1/object/public/reports/%'
  AND (storage_bucket IS NULL OR storage_path IS NULL)
ORDER BY created_at DESC
LIMIT 20;

-- ── 10. path 추출 가능성 확인 (documents) ────────────────────────
-- documents public URL에서 storage_path를 복원할 수 있는지 확인

SELECT
  id,
  file_url,
  regexp_replace(
    file_url,
    '^.*\/storage\/v1\/object\/public\/documents\/',
    ''
  ) AS inferred_storage_path,
  CASE
    WHEN regexp_replace(
      file_url,
      '^.*\/storage\/v1\/object\/public\/documents\/',
      ''
    ) ~ '\.(pdf|jpg|jpeg|png|gif|doc|docx|xls|xlsx)$'
    THEN 'valid_path'
    ELSE 'invalid_path'
  END AS path_validation
FROM documents
WHERE file_url LIKE '%/storage/v1/object/public/documents/%'
  AND (storage_bucket IS NULL OR storage_path IS NULL)
ORDER BY created_at DESC
LIMIT 10;

-- ── 11. path 추출 실패 문서 확인 ────────────────────────────────
-- URL 패턴으로 bucket을 추출할 수 없는 문서

SELECT
  id,
  site_id,
  category,
  title,
  file_url,
  created_at
FROM documents
WHERE file_url IS NOT NULL
  AND (storage_bucket IS NULL OR storage_path IS NULL)
  AND file_url NOT LIKE '%/storage/v1/object/public/reports/%'
  AND file_url NOT LIKE '%/storage/v1/object/public/documents/%'
  AND file_url NOT LIKE '%/storage/v1/object/public/photos/%'
  AND file_url NOT LIKE '%/storage/v1/object/public/drawings/%'
ORDER BY created_at DESC
LIMIT 10;

-- ── 12. storage_path 불일치 문서 확인 ────────────────────────────
-- storage_bucket은 있는데 storage_path가 NULL인 문서

SELECT
  id,
  site_id,
  category,
  title,
  file_url,
  storage_bucket,
  storage_path,
  created_at
FROM documents
WHERE storage_bucket IS NOT NULL
  AND storage_path IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- ── 13. modern 문서 (storage metadata 있는 문서) 샘플 ─────────────
-- 정상적인 storage metadata가 있는 문서 샘플

SELECT
  id,
  site_id,
  category,
  title,
  file_url,
  storage_bucket,
  storage_path,
  source_type,
  source_id,
  approval_status,
  locked_at,
  created_at
FROM documents
WHERE storage_bucket IS NOT NULL
  AND storage_path IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ── 14. backfill UPDATE候选 - reports 문서용 (주석 처리) ─────────
-- 실제 실행 금지! 다음 PR에서 별도로 실행합니다.
--
-- 이 UPDATE는 reports bucket legacy 문서의 storage_bucket과 storage_path를
-- file_url에서 복원합니다.
--
-- 실행 전 반드시 다음을 확인하세요:
-- 1. 백업 생성
-- 2. test 환경에서 먼저 테스트
-- 3. reports bucket이 private 전환되지 않은 상태에서 테스트
--
-- BACKFILL CANDIDATE - DO NOT RUN IN THIS PR
-- UPDATE documents
-- SET
--   storage_bucket = 'reports',
--   storage_path = regexp_replace(
--     file_url,
--     '^.*\/storage\/v1\/object\/public\/reports\/',
--     ''
--   )
-- WHERE file_url LIKE '%/storage/v1/object/public/reports/%'
--   AND (storage_bucket IS NULL OR storage_path IS NULL);

-- ── 15. backfill UPDATE候选 - documents 문서용 (주석 처리) ─────
-- 실제 실행 금지! 다음 PR에서 별도로 실행합니다.
--
-- BACKFILL CANDIDATE - DO NOT RUN IN THIS PR
-- UPDATE documents
-- SET
--   storage_bucket = 'documents',
--   storage_path = regexp_replace(
--     file_url,
--     '^.*\/storage\/v1\/object\/public\/documents\/',
--     ''
--   )
-- WHERE file_url LIKE '%/storage/v1/object/public/documents/%'
--   AND (storage_bucket IS NULL OR storage_path IS NULL);

-- ── 16. backfill UPDATE候选 - photos 문서용 (주석 처리) ─────────
-- 실제 실행 금지! 다음 PR에서 별도로 실행합니다.
--
-- BACKFILL CANDIDATE - DO NOT RUN IN THIS PR
-- UPDATE documents
-- SET
--   storage_bucket = 'photos',
--   storage_path = regexp_replace(
--     file_url,
--     '^.*\/storage\/v1\/object\/public\/photos\/',
--     ''
--   )
-- WHERE file_url LIKE '%/storage/v1/object/public/photos/%'
--   AND (storage_bucket IS NULL OR storage_path IS NULL);

-- ── 17. backfill UPDATE候选 - drawings 문서용 (주석 처리) ───────
-- 실제 실행 금지! 다음 PR에서 별도로 실행합니다.
--
-- BACKFILL CANDIDATE - DO NOT RUN IN THIS PR
-- UPDATE documents
-- SET
--   storage_bucket = 'drawings',
--   storage_path = regexp_replace(
--     file_url,
--     '^.*\/storage\/v1\/object\/public\/drawings\/',
--     ''
--   )
-- WHERE file_url LIKE '%/storage/v1/object/public/drawings/%'
--   AND (storage_bucket IS NULL OR storage_path IS NULL);

-- ── 18. backfill 검증용 SELECT (주석 처리) ─────────────────────
-- backfill 후 실행하여 결과 확인용
-- 실제 실행 금지!
--
-- BACKFILL VERIFICATION - RUN AFTER BACKFILL
-- SELECT
--   'reports' AS bucket,
--   COUNT(*) AS count
-- FROM documents
-- WHERE storage_bucket = 'reports'
-- UNION ALL
-- SELECT
--   'documents' AS bucket,
--   COUNT(*) AS count
-- FROM documents
-- WHERE storage_bucket = 'documents'
-- UNION ALL
-- SELECT
--   'photos' AS bucket,
--   COUNT(*) AS count
-- FROM documents
-- WHERE storage_bucket = 'photos'
-- UNION ALL
-- SELECT
--   'drawings' AS bucket,
--   COUNT(*) AS count
-- FROM documents
-- WHERE storage_bucket = 'drawings'
-- UNION ALL
-- SELECT
--   'NULL' AS bucket,
--   COUNT(*) AS count
-- FROM documents
-- WHERE storage_bucket IS NULL
-- ORDER BY bucket;
