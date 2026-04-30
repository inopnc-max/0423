# Supabase Role & Data-Flow Audit Report

**작성일:** 2026-04-30
**작성자:** Claude Code Audit
**범위:** Frontend role/route/navigation/middleware + Supabase schema/RLS/Storage
**전제:** 코드 수정 없음, migration 없음, Dashboard 확인 필요 항목 별도 분류

---

## 1. Audit 범위

### 확인한 파일

#### Migration 파일 (8개)

| 파일 | 주요 내용 |
|------|-----------|
| `001_initial.sql` | 테이블 생성: workers, sites, daily_logs, photos, notifications, **documents**, materials, material_logs, salary_entries, audit_logs, user_ui_state, issues, site_favorites, billing_docs, hq_requests, admin_directory, search_config, companies. RLS 정책 포함 |
| `002_csv_upload.sql` | csv_upload_logs 테이블 및 RLS |
| `003_documents_storage.sql` | documents Storage 연동 (documents 버킷) |
| `004_documents_storage_metadata.sql` | documents 테이블 확장: storage_bucket, storage_path, source_type, source_id 필드 추가 |
| `005_documents_approval.sql` | documents 테이블 확장: approval_status, approved_at, approved_by, locked_at, locked_by 필드 추가 |
| `006_documents_partner_approval_rls.sql` | documents RLS 강화: partner는 approval_status='approved' 또는 locked_at IS NOT NULL인 경우만 SELECT |
| `007_documents_legacy_file_url_audit.sql` | **실행 불가 (실제 데이터 수정 없음)** — legacy file_url 레코드 감사용 SQL 주석 |
| `008_reports_storage_policies.sql` | reports 버킷 Storage 정책: INSERT(authenticated), SELECT(authenticated), DELETE(admin only) |

#### Frontend 파일

| 파일 | 역할 |
|------|------|
| `src/lib/roles.ts` | Role SSOT (Single Source of Truth) — 5개 role 정의 + alias map |
| `src/lib/route-access.ts` | Role별 route 접근 권한 매핑 |
| `src/lib/navigation.config.ts` | Role별 navigation 메뉴 구성 |
| `src/middleware.ts` | 인증 + route 접근 권한 middleware |
| `src/lib/photo-sheet-document.ts` | photo-sheet PDF → documents 테이블 INSERT |
| `src/app/(app)/confirm-sheet/page.tsx` | confirm-sheet PDF → **site_documents** 테이블 INSERT |
| `src/app/(app)/worklog/page.tsx` | worklog에서 documents/photo-sheet 참조 |
| `src/app/(app)/documents/page.tsx` | documents 테이블 SELECT |
| `src/app/admin/documents/page.tsx` | admin 문서 관리 — documents SELECT/DELETE |
| `src/app/(app)/site/[id]/page.tsx` | 현장 문서 — documents SELECT |
| `src/hooks/useMenuSearch.ts` | 검색 — documents SELECT |

#### 확인한 테이블

| 테이블 | Migration 정의 | RLS | 상태 |
|--------|--------------|-----|------|
| `workers` | ✅ 001 | ✅ | 정상 |
| `sites` | ✅ 001 | ✅ | 정상 |
| `daily_logs` | ✅ 001 | ✅ | 정상 |
| `photos` | ✅ 001 | ✅ | 정상 |
| `notifications` | ✅ 001 | ✅ | 정상 |
| `documents` | ✅ 001+004+005 | ✅ 001+006 | 정상 |
| `materials` | ✅ 001 | ✅ | 정상 |
| `material_logs` | ✅ 001 | ✅ | 정상 |
| `salary_entries` | ✅ 001 | ✅ | 정상 |
| `audit_logs` | ✅ 001 | ✅ | 정상 |
| `user_ui_state` | ✅ 001 | ✅ | 정상 |
| `issues` | ✅ 001 | ✅ | 정상 |
| `site_favorites` | ✅ 001 | ✅ | 정상 |
| `billing_docs` | ✅ 001 | ✅ | 정상 |
| `hq_requests` | ✅ 001 | ✅ | 정상 |
| `admin_directory` | ✅ 001 | ✅ | 정상 |
| `search_config` | ✅ 001 | ✅ | 정상 |
| `companies` | ✅ 001 | ✅ | 정상 |
| `csv_upload_logs` | ✅ 002 | ✅ | 정상 |
| **`site_documents`** | **❌ 없음** | **❌ 없음** | **⚠️ 미 migration** |

#### 확인한 Role

| Role | Frontend 정의 | DB workers.role CHECK | 일치 |
|------|--------------|----------------------|------|
| `worker` | ✅ | ✅ | ✅ |
| `partner` | ✅ | ✅ | ✅ |
| `site_manager` | ✅ | ✅ | ✅ |
| `production_manager` | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ |

> **2026-04-30 업데이트:** Production DB 직접 확인 결과, `workers_role_check` constraint에 `production_manager`가 이미 포함되어 있음이 확인됨.
> Repo의 `001_initial.sql` migration에만 누락되어 있었으며, 이 drift를 정리하는 PR 생성 예정.

#### 확인한 Route/Navigation/Middleware 구조

| Layer | 파일 | 상태 |
|-------|------|------|
| Role 정의 | `src/lib/roles.ts` | ✅ SSOT |
| Route 접근 제어 | `src/lib/route-access.ts` | ✅ production_manager 포함 |
| Navigation 메뉴 | `src/lib/navigation.config.ts` | ✅ production_manager 전용 메뉴 있음 |
| Middleware 인증 | `src/middleware.ts` | ✅ 3계층 인증 |
| 데이터 숨김 | `roles.ts` helper 함수 | ✅ partner salary/manday 숨김 |

---

## 2. 확정된 문제

### 2-1. `production_manager` role — Frontend/DB 불일치 ~~(해결됨)~~

> **2026-04-30 UPDATE:** ~~이슈는 아직 남아있습니다. 아래 내용을 수정합니다.~~ → **Production DB 확인 결과 이미 해결됨.**
> Production DB의 `workers_role_check` constraint에 `production_manager`가 포함되어 있음이 직접 확인됨.
> Repo의 `001_initial.sql`에만 누락되어 있었으므로, migration 파일만 동기화하면 됨.

**과거 이슈 (초기 감사 보고서):**
- Frontend `src/lib/roles.ts`에서 `'production_manager'`를 정규 role로 정의
- `src/lib/route-access.ts`에서 `/production/*` route를 `production_manager` 전용으로 보호
- `src/lib/navigation.config.ts`에서 `production_manager` 전용 메뉴 제공
- **하지만** 초기 감사 당시 Supabase `workers.role` CHECK constraint에 `'production_manager'`가 없음으로 기록됨

**Production DB 실제 상태 (2026-04-30 확인):**
```sql
-- Production DB에서 직접 실행 결과
CHECK ((role = ANY (ARRAY['worker', 'partner', 'site_manager', 'admin', 'production_manager'])))
```
✅ `production_manager` 이미 포함

**workers.role 분포 (2026-04-30 확인):**

| role | count |
|------|-------|
| admin | 1 |
| partner | 1 |
| site_manager | 1 |
| worker | 7 |
| production_manager | **0** |

✅ 현재 `production_manager` 사용자 0명 — signup CHECK 위배 위험 없음

**결론:**
- ~~운영 DB 긴급 수정 필요 (추가 migration 생성)~~ → **필요 없음**
- Repo migration drift 정리 필요 (`001_initial.sql` CHECK 동기화) → **이 PR에서 수행**

---

### 2-2. `site_documents` 테이블 — Migration 미정의, 코드에서만 참조

**문제:**
- `src/app/(app)/confirm-sheet/page.tsx:422`에서 `supabase.from('site_documents').insert()` 호출
- Migration 파일 어디에도 `CREATE TABLE site_documents` 없음
- `site_documents`에 대한 RLS 정책도 migration에 없음

**두 테이블 비교:**

| 항목 | `documents` | `site_documents` (코드 기준) |
|------|-------------|---------------------------|
| Migration 정의 | ✅ 001+004+005 | ❌ 없음 |
| RLS | ✅ documents_read/write | ❌ 없음 |
| site_id | ✅ UUID | ✅ 존재 |
| title | ✅ TEXT | ✅ TEXT |
| file_url | ✅ TEXT | ✅ TEXT |
| file_size | ✅ INTEGER | ✅ INTEGER |
| category | ✅ 9개 CHECK | ❌ doc_type 사용 |
| file_ext | ❌ 없음 | ✅ 있음 |
| storage_bucket | ✅ | ❌ 없음 |
| storage_path | ✅ | ❌ file_path 사용 |
| source_type | ✅ | ❌ 없음 |
| source_id | ✅ | ❌ 없음 |
| approval_status | ✅ | ❌ 없음 |
| work_date | ❌ 없음 | ✅ 있음 |
| worklog_id | ❌ 없음 | ✅ 있음 |
| badge | ❌ 없음 | ✅ 있음 |

**사용 위치:**
- `documents`: worklog(page.tsx), photo-sheet-document.ts, admin/documents(page.tsx), confirm-sheet(page.tsx) SELECT, site/[id]/page.tsx SELECT, useMenuSearch
- `site_documents`: **confirm-sheet/page.tsx INSERT만** (1곳)

**Storage 업로드:**
- photo-sheet → `reports` 버킷 → `documents` 테이블
- confirm-sheet → `documents` 버킷 → `site_documents` 테이블

**영향:**
- `site_documents` 테이블이 Dashboard에서 수동 생성되지 않았으면 **confirm-sheet 저장 시 runtime 에러**
- RLS 미설정 시 모든 인증 사용자가 해당 테이블 전체 데이터 접근 가능

---

### 2-3. Storage file_url/file_path 사용 방식 혼재

**문제:** `documents` 테이블에 두 세대의 필드 체계가 공존

| 세대 | 필드 | 설명 |
|------|------|------|
| Legacy | `file_url`만 | 001 migration — public bucket 직접 URL |
| Modern | `file_url` + `storage_bucket` + `storage_path` | 004 migration — signed URL 전환용 |

**코드 사용 패턴:**

```typescript
// photo-sheet: file_url + storage_bucket + storage_path 모두 저장
photo-sheet-document.ts:
  storage_bucket: 'reports'
  storage_path: 'site-123/2024-01-15/photo-sheet/photo-sheet-...pdf'
  file_url: https://.../reports/site-123/... (public URL)

file_url: https://.../documents/confirm-sheets/...pdf  // public URL

// confirm-sheet: file_url만 저장 (storage_bucket/path 없음)
confirm-sheet/page.tsx:
  file_path: 'confirm-sheets/ConfirmSheet_...pdf'  // storage 내부 경로 (storage_path 아님)
  file_url: https://.../documents/confirm-sheets/...  // public URL
  // storage_bucket, storage_path 없음
```

**Storage 버킷 사용:**

| 버킷 | photo-sheet | confirm-sheet | documents page | admin documents |
|------|------------|---------------|----------------|-----------------|
| `documents` | ❌ | ✅ 업로드/조회 | ✅ 조회 fallback | ✅ 삭제 |
| `reports` | ✅ 업로드/조회 | ❌ | ❌ | ✅ 삭제 (legacy) |
| `photos` | ❌ | ❌ | ❌ | ❌ |
| `drawings` | ❌ | ❌ | ❌ | ❌ |

---

### 2-4. Storage bucket RLS 정책 불균형

**확인된 Storage 정책:**
- `documents` 버킷: migration 003 — INSERT/SELECT (조건 미상), DELETE (admin only 추정)
- `reports` 버킷: migration 008 — INSERT(authenticated), SELECT(authenticated), DELETE(admin only)

**불확실 사항:**
- `photos` 버킷 — RLS 없음 (Dashboard에서 public 설정일 가능성)
- `drawings` 버킷 — RLS 없음
- `daily-log-attachments` 버킷 — 코드 주석에만 언급
- `signatures` 버킷 — 코드 주석에만 언급
- `documents` 버킷 DELETE 정책 — admin only인지 확인 필요

---

### 2-5. documents RLS partner 제한 강화

**006 migration:**
- partner는 `documents` 테이블에서 `approval_status='approved'` 또는 `locked_at IS NOT NULL`인 레코드만 SELECT 가능
- worker, site_manager, admin, upload한 사용자는 full access

**확인 필요:** 이 정책이 photo-sheet 문서에도 동일하게 적용되는지 (confirm-sheet는 `site_documents` 테이블 사용하므로 영향 없음)

---

## 3. 확인 필요 항목

### Dashboard에서 반드시 확인해야 할 항목

| # | 확인 항목 | 예상 결과 | 위험도 |
|---|----------|----------|--------|
| ~~1~~ | ~~`workers` 테이블에 `role='production_manager'`인 사용자가 있는지~~ | ✅ ~~있으면 모든 인증에서 에러 발생~~ | ~~🔴 P0~~ → **✅ 확인됨 (0명, 위험 없음)** |
| 2 | `site_documents` 테이블이 Dashboard에 존재하는지 | 미존재 시 confirm-sheet INSERT 에러 | 🔴 P0 |
| 3 | `site_documents`에 현재 데이터가 있는지 | 데이터 있으면 migration 시 이전 필요 | 🟡 P1 |
| 4 | `documents` 테이블의 legacy `file_url` only 레코드 수 | migration 007 SQL로 확인 가능 | 🟢 P2 |
| 5 | `photos`/`drawings` 버킷이 public인지 | public이면 RLS 없이 파일 접근 가능 | 🟡 P1 |
| 6 | `documents` 버킷의 정확한 RLS 정책 | DELETE는 admin만인지, INSERT 정책은何か | 🟡 P1 |
| 7 | `reports` 버킷 파일 경로 패턴 | photo-sheet 외 다른 문서 유형도 사용하는지 | 🟢 P2 |

---

## 4. 위험도 분류

### P0 — 즉시 막힐 수 있는 문제 (확정)

| 문제 | 설명 |
|------|------|
| `production_manager` role 없음 | ✅ ~~해당 role 사용자가 있으면 DB INSERT/UPDATE 시 에러~~ → **Production DB 확인 결과 해결됨** |
| `site_documents` 미 migration | 테이블 미존재 시 confirm-sheet INSERT 시 runtime 에러 |

### P1 — 다음 migration 필요

| 문제 | 설명 |
|------|------|
| `workers.role` CHECK 수정 | `production_manager` 추가 |
| `site_documents` 테이블 정의 또는 documents 통합 | |
| Storage 버킷별 RLS 확인 및 통일 | photos, drawings 버킷 정책 미확인 |

### P2 — 프론트 참조 정리 필요

| 문제 | 설명 |
|------|------|
| `file_url` vs `storage_bucket`/`storage_path` 혼재 정리 | documents 테이블의 이중 필드 체계 |
| confirm-sheet `file_path` → `storage_path` 필드명 통일 | |
| Storage 버킷 사용 패턴 정리 | photo-sheet=reports, confirm-sheet=documents |

### P3 — 장기 개선

| 문제 | 설명 |
|------|------|
| `audit_logs` 테이블 실제 연결 | migration에 정의는 있으나 코드에서 실제 호출 확인 안 됨 |
| `materials`/`material_logs` 버킷 연동 | migration에 정의 없음 |
| RLS view 지원 불가로 인한 view 기반 접근 제한 불가 | |

---

## 5. 다음 PR 제안

### PR 1: production_manager role 정합성 migration ~~(진행 예정)~~ → **✅ 완료 (이 PR)**

> **2026-04-30:** Production DB 확인 결과 이미 `production_manager`가 포함되어 있었음. Repo migration drift만 정리.

~~**브랜치명:** `fix/workers-role-production-manager`~~

~~** 목적:** Frontend-DB role 정합성 확보~~

~~** 수정:**
- `supabase/migrations/009_add_production_manager_role.sql`
  ```sql
  ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_role_check;
  ALTER TABLE workers ADD CONSTRAINT workers_role_check
    CHECK (role IN ('worker', 'partner', 'site_manager', 'production_manager', 'admin'));
  ```~~

~~** 위험도:** 🟡 중간 — 기존 production_manager 사용자가 없으면 무해~~

~~** 선행 조건:** Dashboard에서 `workers.role='production_manager'` 사용자 유무 확인~~ → ✅ **선행 조건 충족 (0명 확인됨)**

---

### PR 2: documents/site_documents 테이블 참조 정리

**브랜치명:** `fix/confirm-sheet-documents-table-migration`

** 목적:** confirm-sheet INSERT를 `site_documents`에서 `documents` 테이블로 통일

** 수정:**
- `supabase/migrations/010_migrate_site_documents_to_documents.sql`
  - `site_documents` 데이터 → `documents` 테이블로 이전 (`category='확인서'`)
  - `site_documents` 테이블 DROP (또는 RLS만 추가하고 유지)
- `src/app/(app)/confirm-sheet/page.tsx`
  - `supabase.from('site_documents').insert()` → `supabase.from('documents').insert()`
  - `doc_type` → `category='확인서'`
  - `file_path` → `storage_path`, `storage_bucket='documents'` 추가

** 위험도:** 🟡 중간 — 기존 `site_documents` 데이터 보존 필요

** 선행 조건:** Dashboard에서 `site_documents` 테이블 및 데이터 확인

---

### PR 3: Storage file path/url helper 정리

**브랜치명:** `refactor/storage-url-helper`

** 목적:** `file_url` vs `storage_bucket`/`storage_path` 혼재 해소, helper 함수 통일

** 수정:**
- `src/lib/storage/storage-helper.ts` 확장
- `src/lib/photo-sheet-document.ts` — helper 사용으로 통일
- `src/app/(app)/confirm-sheet/page.tsx` — helper 사용으로 통일
- `src/app/(app)/documents/page.tsx` — URL resolution 로직 정리
- `src/components/preview/FilePreviewGateway.tsx` — URL resolution 로직 정리

** 위험도:** 🟢 낮음 — interface 유지하며 내부 구현 개선

** 선행 조건:** PR 2 완료 후 (테이블 구조 확정 후 진행)

---

### PR 4: RLS 정책 보강

**브랜치명:** `fix/storage-rls-policies`

** 목적:** Storage 버킷별 RLS 정책 통일 및 documents 버킷 DELETE 정책 확인

** 수정:**
- `supabase/migrations/011_storage_rls_unified.sql`
  - `photos`/`drawings` 버킷 RLS 추가 (authenticated SELECT)
  - `documents` 버킷 DELETE policy admin only 확인
- `src/lib/photo-sheet-pdf.ts` 주석 업데이트 (버킷 사용 현황 문서화)

** 위험도:** 🟡 중간 — 기존 policy 변경 시 접근 제한 영향

** 선행 조건:** Dashboard에서 photos/drawings 버킷 현재 설정 확인

---

### PR 5: audit_logs 실제 연결

**브랜치명:** `feat/audit-logs-integration`

** 목적:** `audit_logs` 테이블이 migration에 정의되어 있으나 실제로 사용되지 않는 문제 해결

** 수정:**
- `src/lib/audit.ts` 생성 또는 기존 audit helper 확인
- CRUD operation 후 audit_log INSERT 추가
- `supabase/migrations/012_audit_logs_rls_update.sql` (필요시)

** 위험도:** 🟢 낮음 — 새 기능 추가

** 선행 조건:** PR 1~4 완료 후 진행 (현재 중요도 낮음)

---

## 부록: 문서 변경 이력

| 날짜 | 작성자 | 내용 |
|------|--------|------|
| 2026-04-30 | Claude Code | Initial audit report |
| 2026-04-30 | Claude Code | PR fix/supabase-production-manager-schema-drift — Production DB 확인 결과 추가, 2-1/테이블/Risk/PR1 상태 업데이트 (production_manager 이미 Production DB에 포함, repo migration drift만 정리) |
