-- ============================================================
-- reports bucket Storage policy 추가
-- PR #46: reports Storage policy 추가
--
-- 목적:
--   reports bucket private 전환 전에 Storage objects에 대한
--   최소한의 upload/select/delete policy를 추가합니다.
--
-- 변경 내용:
--   - reports_insert_authenticated: 인증된 사용자가 reports bucket에 파일 업로드
--   - reports_select_authenticated: 인증된 사용자가 reports bucket 객체 조회/signed URL 생성
--   - reports_delete_admin: admin만 reports bucket 객체 삭제
--
-- 주의:
--   - 이번 PR에서는 bucket public/private 설정 변경 없음
--   - app 코드 변경 없음
--   - documents RLS 변경 없음
--   - file_url fallback 변경 없음
--   - private 전환은 다음 PR에서 수동 검증 후 진행
--   - UPDATE policy는 추가하지 않음 (upsert 동작은 수동 테스트 필요)
-- ============================================================

-- ── 1. reports bucket INSERT policy ─────────────────────────────
-- 인증된 사용자가 reports bucket에 파일을 업로드할 수 있게 합니다.
-- app의 uploadToStorage()가 browser client로 동작하므로 authenticated insert가 필요합니다.

DROP POLICY IF EXISTS "reports_insert_authenticated" ON storage.objects;

CREATE POLICY "reports_insert_authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports'
);

-- ── 2. reports bucket SELECT policy ──────────────────────────────
-- 인증된 사용자가 reports bucket 객체에 대해 signed URL 생성/조회가 가능하도록 합니다.
--
-- 참고:
--   documents RLS에서 이미 partner 승인완료/locked 제한을 적용했습니다.
--   Storage policy에서 documents.approval_status 직접 검증은 이번 PR에서 하지 않습니다.
--   세부 역할별 제한은 다음 단계에서 검토합니다.

DROP POLICY IF EXISTS "reports_select_authenticated" ON storage.objects;

CREATE POLICY "reports_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports'
);

-- ── 3. reports bucket DELETE policy ─────────────────────────────
-- admin만 reports bucket 객체를 삭제할 수 있도록 합니다.
-- admin documents page의 delete 로직과 맞춰야 합니다.
--
-- 참고:
--   site_manager/partner/worker delete 권한은 이번 PR에서 추가하지 않습니다.

DROP POLICY IF EXISTS "reports_delete_admin" ON storage.objects;

CREATE POLICY "reports_delete_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports'
  AND EXISTS (
    SELECT 1
    FROM workers
    WHERE workers.id = auth.uid()
      AND workers.role = 'admin'
  )
);

-- ── 4. UPDATE policy는 추가하지 않음 ─────────────────────────────
-- 현재 uploadToStorage()는 upsert: true를 사용할 수 있으므로,
-- Supabase Storage에서 upsert가 UPDATE 권한을 요구할 수 있습니다.
--
-- 선택:
--   A안. UPDATE policy 추가 안 함 (더 보수적)
--       - 만약 upsert가 실패하면 다음 PR에서 보강
--
--   B안. reports_update_authenticated 추가
--       - upload upsert 호환성은 좋아짐
--       - 덮어쓰기 위험이 커짐
--
-- 결정: 이번 PR에서는 UPDATE policy를 추가하지 않습니다.
--       upsert 동작은 Supabase Dashboard 또는 SQL Editor에서 수동 테스트 필요
--
-- 테스트 방법:
--   1. photo_sheet PDF 파일 1건 업로드
--   2. 동일한 파일명으로 다시 업로드 (upsert)
--   3. upsert 성공 여부 확인
--   4. upsert 실패 시 UPDATE policy 추가 필요
