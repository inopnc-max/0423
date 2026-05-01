# INOPNC 0423 릴리즈 전 Smoke Test 체크리스트

## 목적

릴리즈 직전 `worker`, `site_manager`, `partner`, `admin`, `production_manager` 전체 역할 기준으로 화면 접근, 데이터 노출, 문서/사진대지/작업일지/생산관리 흐름에 회귀가 없는지 빠르게 확인한다.

## 사전 준비

| 항목 | 확인 내용 | 예상 결과 | 실패 시 확인 파일 |
| --- | --- | --- | --- |
| 최신 코드 | `main`과 `origin/main` 동일 여부 확인 | 최신 릴리즈 후보 HEAD에서 테스트 | `git status`, `git log -1 --oneline` |
| 환경 변수 | Supabase public URL/anon key 설정 | 로그인과 데이터 조회 가능 | `.env.local`, `src/lib/supabase/config.ts` |
| 테스트 계정 | 역할별 테스트 계정 1개 이상 준비 | 각 계정의 `workers.role`이 기대 역할과 일치 | `src/lib/roles.ts`, Supabase `workers` |
| 테스트 현장 | worker/site_manager/partner가 접근 가능한 현장 준비 | 역할별 현장 목록이 정상 표시 | `src/contexts/selected-site-context.tsx`, `src/lib/site/siteRecords.ts` |

## 역할별 테스트 계정

| 역할 | 테스트 계정 조건 | 주요 확인 범위 | 예상 결과 | 실패 시 확인 파일 |
| --- | --- | --- | --- | --- |
| worker | 일반 작업자, 현장 접근 권한 있음 | 홈, 출역, 작업일지, 현장, 문서함, 필수서류 업로드 | 작업자 전용 UI와 저장/업로드 흐름 표시 | `src/app/(app)/home/page.tsx`, `src/app/(app)/worklog/page.tsx`, `src/app/(app)/documents/page.tsx` |
| site_manager | 담당 현장 있는 현장관리자 | 출역 승인, 작업일지 승인, 담당 근로자 목록 | 담당 현장 중심 데이터만 표시 | `src/app/admin/worklogs/page.tsx`, `src/app/admin/users/page.tsx`, `src/hooks/site-manager/useSiteManagerDashboard.ts` |
| partner | 협력사/파트너 계정 | 읽기전용 홈, 현장, 문서함, 검색, 미리보기 | 승인/잠금/공유 문서만 표시, 민감자료 비노출 | `src/lib/documents/partnerDocuments.ts`, `src/app/(app)/documents/page.tsx`, `src/app/(app)/site/[id]/page.tsx` |
| admin | 본사 관리자 | 관리자 홈, 문서 승인, 사용자, 작업일지 승인 | 전체 관리자 화면 접근 가능 | `src/app/admin/page.tsx`, `src/app/admin/documents/page.tsx`, `src/app/admin/users/page.tsx` |
| production_manager | 생산관리자 | 생산 홈, 입력, 내역, 요약, 검색 제한 | 생산 화면만 접근, 일반 업무 화면 차단 | `src/lib/route-access.ts`, `src/app/production/page.tsx`, `src/components/production/ProductionEntryDraftForm.tsx` |

## 공통 접근 Smoke Test

| 번호 | 시나리오 | 역할 | 예상 결과 | 실패 시 확인 파일 |
| --- | --- | --- | --- | --- |
| 1 | 로그인 후 `/home` 진입 | 전체 | 역할별 홈 카드/섹션 표시 | `src/app/(app)/home/page.tsx`, `src/components/layout/AppShell.tsx` |
| 2 | BottomNav 메뉴 확인 | 전체 | 역할별 허용 메뉴만 표시 | `src/lib/navigation.config.ts`, `src/lib/route-access.ts` |
| 3 | 직접 URL 접근: 허용되지 않은 경로 입력 | partner, production_manager, site_manager | `/home`으로 리다이렉트 또는 접근 차단 | `src/middleware.ts`, `src/lib/route-access.ts` |
| 4 | 통합 검색 화면 진입 | 전체 | 역할별 접근 가능한 결과/빠른 메뉴만 표시 | `src/app/(app)/search/page.tsx`, `src/hooks/useMenuSearch.ts` |
| 5 | 설정/알림 접근 | 전체 | 공통 화면 접근 가능 | `src/app/(app)/settings/page.tsx`, `src/app/(app)/notifications/page.tsx` |

## Worker Smoke Test

| 번호 | 시나리오 | 예상 결과 | 실패 시 확인 파일 |
| --- | --- | --- | --- |
| 1 | 홈에서 현장 선택 변경 | 선택 현장 저장 및 관련 카드 갱신 | `src/contexts/selected-site-context.tsx`, `src/components/site/SiteCombobox.tsx` |
| 2 | 출역 화면 확인 | 작업자 출역 정보와 급여 숨김 정책에 맞는 값 표시 | `src/app/(app)/output/page.tsx`, `src/lib/roles.ts` |
| 3 | 작업일지 작성/임시저장/제출 | 작업일지 저장 성공, 오류 시 empty/error state 표시 | `src/app/(app)/worklog/page.tsx`, `src/lib/offline/worklog-draft.ts` |
| 4 | 필수서류 패널 확인 | 진행률 카드와 업로드 Sheet 표시 | `src/components/documents/RequiredDocumentProgressCard.tsx`, `src/components/documents/RequiredDocumentUploadSheet.tsx` |
| 5 | 최근 본 문서 열람 | 미리보기 열리고 문서 조회 이벤트 기록 | `src/components/home/RecentViewedDocuments.tsx`, `src/components/preview/FilePreviewGateway.tsx` |

## Site Manager Smoke Test

| 번호 | 시나리오 | 예상 결과 | 실패 시 확인 파일 |
| --- | --- | --- | --- |
| 1 | `/admin/worklogs` 접근 | 현장관리자 전용 승인 패널만 표시 | `src/app/admin/worklogs/page.tsx`, `src/components/site-manager/SiteManagerApprovalPanel.tsx` |
| 2 | 작업일지 승인/반려 | 담당 현장 일지에 대해 승인/반려 처리 가능 | `src/hooks/site-manager/useSiteManagerDashboard.ts`, `src/lib/site-manager/siteManagerRecords.ts` |
| 3 | `/admin/users` 접근 | 담당 현장 근로자 패널만 표시, 전체 사용자 테이블 비노출 | `src/app/admin/users/page.tsx`, `src/components/site-manager/SiteManagerWorkerPanel.tsx` |
| 4 | 출역 화면 확인 | 현장관리자용 출역 요약/관리 UI 표시 | `src/app/(app)/output/page.tsx`, `src/hooks/site-manager/useSiteManagerDashboard.ts` |
| 5 | 문서함/현장 화면 확인 | 담당 현장 문서와 현장 정보 접근 가능 | `src/app/(app)/documents/page.tsx`, `src/app/(app)/site/page.tsx` |

## Partner Smoke Test 및 민감자료 비노출

| 번호 | 시나리오 | 예상 결과 | 실패 시 확인 파일 |
| --- | --- | --- | --- |
| 1 | partner 로그인 후 홈 확인 | 읽기전용 포털 카드와 최근 보고서 표시 | `src/app/(app)/home/page.tsx`, `src/components/partner/PartnerRecentReports.tsx` |
| 2 | 문서함 조회 | approved 또는 locked 문서만 표시 | `src/lib/documents/partnerDocuments.ts`, `src/app/(app)/documents/page.tsx` |
| 3 | worker_required_document 조회 시도 | 개인 필수서류 비노출 | `src/lib/documents/partnerDocuments.ts`, `src/hooks/useMenuSearch.ts` |
| 4 | 급여/원가/마진성 문서 조회 시도 | 급여/민감자료 비노출 | `src/lib/roles.ts`, `src/app/(app)/output/page.tsx`, `src/lib/documents/partnerDocuments.ts` |
| 5 | draft/pending/rejected 문서 조회 시도 | 승인 전 문서 비노출 | `src/lib/documents/partnerDocuments.ts`, `src/components/partner/PartnerDocumentOverview.tsx` |
| 6 | `/worklog`, `/output`, `/materials`, `/production` 직접 접근 | 접근 차단 또는 `/home` 리다이렉트 | `src/middleware.ts`, `src/lib/route-access.ts` |
| 7 | 검색에서 문서/작업자/일지 결과 확인 | partner는 허용된 site 중심 결과만 표시 | `src/app/(app)/search/page.tsx`, `src/hooks/useMenuSearch.ts` |
| 8 | PreviewCenter에서 문서 미리보기 | readonly dock만 표시, 편집/저장 동작 없음 | `src/components/layout/AppShell.tsx`, `src/components/preview/PreviewProvider.tsx` |

## Admin Smoke Test

| 번호 | 시나리오 | 예상 결과 | 실패 시 확인 파일 |
| --- | --- | --- | --- |
| 1 | 관리자 홈 진입 | 관리자 대시보드 요약 카드/승인 개요 표시 | `src/app/admin/page.tsx`, `src/hooks/admin/useAdminDashboard.ts` |
| 2 | 문서 관리 화면 | 문서 목록, 미리보기, 다운로드, 사진대지 승인 버튼 표시 | `src/app/admin/documents/page.tsx`, `src/lib/photo-sheet-approval.ts` |
| 3 | 사진대지 승인/잠금 | 승인 후 `approval_status=approved`, `locked_at` 설정 | `src/lib/photo-sheet-approval.ts`, `src/lib/photo-sheet-document.ts` |
| 4 | 사용자 관리 화면 | 전체 사용자 목록과 역할 표시 | `src/app/admin/users/page.tsx`, `src/lib/roles.ts` |
| 5 | 작업일지 승인 화면 | pending/approved/rejected/draft 필터와 승인/반려 가능 | `src/app/admin/worklogs/page.tsx` |
| 6 | 금지 민감자료 노출 정책 확인 | admin은 관리 목적 접근 가능, partner 정책 완화 없음 | `src/lib/documents/partnerDocuments.ts`, `src/lib/route-access.ts` |

## Production Manager Smoke Test

| 번호 | 시나리오 | 예상 결과 | 실패 시 확인 파일 |
| --- | --- | --- | --- |
| 1 | `/production` 진입 | 생산관리자 대시보드 표시 | `src/app/production/page.tsx`, `src/hooks/production/useProductionDashboard.ts` |
| 2 | `/production/input` 진입 | 입력 UX 표시, 저장 버튼은 준비/비활성 상태 | `src/app/production/input/page.tsx`, `src/components/production/ProductionEntryDraftForm.tsx` |
| 3 | `/production/logs` 진입 | 생산 내역 조회 UI 표시 | `src/app/production/logs/page.tsx`, `src/components/production/ProductionRecentEntries.tsx` |
| 4 | `/production/summary` 진입 | 생산 요약 카드 표시 | `src/app/production/summary/page.tsx`, `src/components/production/ProductionSummaryCards.tsx` |
| 5 | 일반 업무 경로 직접 접근 | `/output`, `/worklog`, `/site`, `/documents`, `/materials`, `/hq-requests` 접근 차단 | `src/middleware.ts`, `src/lib/route-access.ts` |
| 6 | 검색 빠른 메뉴 확인 | 생산관리자가 접근 가능한 메뉴만 표시 | `src/app/(app)/search/page.tsx`, `src/lib/route-access.ts` |

## 사진대지 End-to-End Smoke Test

| 단계 | 시나리오 | 역할 | 예상 결과 | 실패 시 확인 파일 |
| --- | --- | --- | --- | --- |
| 1 | 작업일지 사진 첨부 | worker/admin | 사진 첨부와 상태 선택 가능 | `src/app/(app)/worklog/page.tsx`, `src/components/photo-sheet/PhotoSheetWizard.tsx` |
| 2 | Wizard 설정 | worker/admin | 보수전/보수후/영수증/기타, 표시명 저장 | `src/components/photo-sheet/PhotoSheetWizard.tsx`, `src/lib/worklog-media.ts` |
| 3 | 사진대지 draft 생성 | worker/admin | 미리보기에서 사진대지 렌더링 | `src/components/photo-sheet/PhotoSheetDraftViewer.tsx`, `src/components/preview/reports/PhotoSheetA4Preview.tsx` |
| 4 | 최종본 저장 | worker/admin | Storage 저장 및 documents 등록 | `src/lib/photo-sheet-document.ts`, `src/lib/photo-sheet-pdf.ts` |
| 5 | 승인/잠금 | admin | 승인 후 locked 상태로 전환 | `src/app/admin/documents/page.tsx`, `src/lib/photo-sheet-approval.ts` |
| 6 | partner 열람 | partner | 승인/잠금된 사진대지만 문서함/현장에서 열람 | `src/lib/documents/partnerDocuments.ts`, `src/app/(app)/documents/page.tsx` |
| 7 | 승인 전 문서 재저장 방지 | worker/admin | approved/locked 문서를 draft로 덮어쓰지 않음 | `src/lib/photo-sheet-document.ts`, `src/app/(app)/worklog/page.tsx` |

## PreviewCenter Smoke Test

| 번호 | 시나리오 | 예상 결과 | 실패 시 확인 파일 |
| --- | --- | --- | --- |
| 1 | PDF 문서 미리보기 | iframe 또는 파일 게이트웨이로 표시 | `src/components/preview/FilePreviewGateway.tsx`, `src/app/(app)/documents/page.tsx` |
| 2 | 이미지 문서 미리보기 | 이미지가 화면 안에 맞게 표시 | `src/components/preview/FilePreviewGateway.tsx` |
| 3 | 사진대지 미리보기 | A4 preview가 readonly로 표시 | `src/components/preview/reports/PhotoSheetA4Preview.tsx` |
| 4 | 도면 마크업 미리보기 | 멀티페이지 도면과 마킹이 표시 | `src/components/preview/reports/DrawingMarkupMultiPagePreview.tsx` |
| 5 | 다운로드 액션 | 허용된 문서만 다운로드 가능 | `src/components/preview/PreviewActionDock.tsx`, `src/lib/storage/storage-helper.ts` |

## 빌드 및 타입 검증

| 번호 | 명령 | 예상 결과 | 실패 시 확인 파일 |
| --- | --- | --- | --- |
| 1 | `npm run type-check` | TypeScript 오류 없음 | 오류 출력의 파일 경로 |
| 2 | `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 후 `npm run build` | Next.js production build 성공 | `src/lib/supabase/config.ts`, 오류 출력의 파일 경로 |
| 3 | `git diff --name-only` | 릴리즈 후보 변경 파일만 표시 | 변경 파일 목록 |
| 4 | `git diff --check` | whitespace/error 없음 | 오류 출력의 파일 경로 |

## 실패 기록 템플릿

| 항목 | 내용 |
| --- | --- |
| 테스트 일시 |  |
| 테스트 역할 |  |
| 계정 |  |
| 현장 |  |
| 실패 시나리오 번호 |  |
| 실제 결과 |  |
| 예상 결과 |  |
| 스크린샷/로그 |  |
| 우선 확인 파일 |  |
| 조치 상태 | Open / Fixed / Retest / Deferred |
