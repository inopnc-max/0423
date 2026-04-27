-- ============================================================
-- documents 테이블 partner 역할 사진대지 승인완료 RLS 정책 강화
-- PR #40: documents RLS partner 승인완료 조건 추가
--
-- 목적:
--   partner role 사용자가 documents 테이블에서 사진대지 문서를 조회할 때
--   approval_status='approved' 또는 locked_at IS NOT NULL 인 문서만 조회 가능하도록 RLS를 보강합니다.
--
-- 변경 내용:
--   - documents_read policy를 재생성하여 partner 조건에 사진대지 승인완료 조건 추가
--   - admin/site_manager/uploaded_by 기존 권한은 유지
--
-- 주의:
--   - Storage policy는 이번 PR에서 변경하지 않습니다.
--   - reports bucket public/private 전환은 별도 PR에서 검토합니다.
--   - existing public file_url fallback은 이번 PR에서 변경하지 않습니다.
--   - documents 테이블 컬럼은 변경하지 않습니다.
--   - 기존 데이터 backfill은 하지 않습니다.
-- ============================================================

-- ── Drop existing documents_read policy ────────────────────────
DROP POLICY IF EXISTS "documents_read" ON documents;

-- ── Create new documents_read policy ───────────────────────────
-- 기존 policy 구조를 유지하되, partner 조건에만 사진대지 승인완료 조건을 추가합니다.
--
-- 조건 설명:
--   1. uploaded_by: 본인 문서는 언제든 조회 가능 (기존 유지)
--   2. admin/site_manager: 모든 문서 조회 가능 (기존 유지)
--   3. partner: allowed_companies 포함 site 문서 조회 가능하되,
--      사진대지(source_type='photo_sheet' 또는 category='사진대지')는
--      approval_status='approved' 또는 locked_at IS NOT NULL 이어야 함
--
CREATE POLICY "documents_read" ON documents
FOR SELECT
USING (
  -- Condition 1: uploaded_by 본인 문서 조회 가능 (기존 유지)
  auth.uid() = uploaded_by

  -- Condition 2: admin/site_manager 모든 문서 조회 가능 (기존 유지)
  OR EXISTS (
    SELECT 1
    FROM workers
    WHERE id = auth.uid()
      AND role IN ('admin', 'site_manager')
  )

  -- Condition 3: partner allowed_companies 포함 site 문서 조회 가능
  -- 단, 사진대지(source_type='photo_sheet' 또는 category='사진대지')는
  -- approved/locked 상태인 경우에만 허용
  OR EXISTS (
    SELECT 1
    FROM workers w, sites s
    WHERE w.id = auth.uid()
      AND w.role = 'partner'
      AND s.id = documents.site_id
      AND s.allowed_companies @> ARRAY[w.company]
      AND (
        -- 사진대지가 아닌 문서는 기존처럼 허용
        (
          COALESCE(documents.source_type, '') <> 'photo_sheet'
          AND COALESCE(documents.category, '') <> '사진대지'
        )
        -- 사진대지는 approved 또는 locked 상태만 허용
        OR documents.approval_status = 'approved'
        OR documents.locked_at IS NOT NULL
      )
  )
);
