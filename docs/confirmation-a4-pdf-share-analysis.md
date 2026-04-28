# 확인서 A4 PDF 저장/공유 기능 구현 사전 분석

**작성일:** 2026-04-28
**PR:** #65 (문서/가이드만)
**대상 레포:** https://github.com/inopnc-max/0423
**main 기준:** be86b16123e40effa96d3afbc94cb506017d6ffc

---

## 핵심 전제: 확인서는 자동 보고서가 아니다

- 확인서는 **작업일지 자동 매핑 보고서가 아니다.**
- 확인서는 **독립 입력 양식 + A4 PDF 출력 + 저장/공유 가능한 문서**이다.
- 확인서는 **사진대지 사진을 자동 첨부하지 않는다.**
- 확인서는 **도면마킹을 자동 첨부하지 않는다.**
- 확인서는 **조치보고서를 자동 병합하지 않는다.**
- 확인서는 **승인값 기반 자동 보고서로 취급하지 않는다.**

---

## 1. 현재 확인서 관련 코드 위치

### 1.1 라우트

| 파일 | 경로 | 설명 |
|------|------|------|
| page.tsx | `src/app/(app)/confirm-sheet/page.tsx` | `/confirm-sheet` — 확인서 입력/미리보기/저장 페이지 |

### 1.2 컴포넌트 (`src/components/confirm-sheet/`)

| 파일 | 설명 |
|------|------|
| `types.ts` | `ConfirmSheetDraft`, `ConfirmSheetDraftInput`, `SiteInfo`, `DailyLogInfo` 인터페이스 |
| `phrasePresets.ts` | `WORK_CONTENT_PRESETS`, `SPECIAL_NOTES_PRESETS` — 미리 정의된 문구 |
| `ConfirmSheetForm.tsx` | 4개 섹션 입력 폼 (기본정보, 작업내용, 특기사항, 확인자 정보) |
| `ConfirmSheetSignaturePad.tsx` | Canvas 기반 서명 입력 (mouse + touch 지원, PNG dataURL 출력) |
| `ConfirmSheetPdfTemplate.tsx` | A4 한글 확인서 렌더링 템플릿 (Tailwind 기반, `showPlaceholder` 지원) |
| `index.ts` | Barrel export |

### 1.3 라이브러리 (`src/lib/`)

| 파일 | 설명 |
|------|------|
| `routes.constants.ts` | `ROUTES.confirmSheet = '/confirm-sheet'` |
| `route-access.ts` | `/confirm-sheet` 접근 역할: `worker`, `partner`, `site_manager`, `admin` (NOT `production_manager`) |
| `navigation.config.ts` | Navigation menu에 FileSignature 아이콘으로 표시 |

### 1.4 Preview 연결

| 파일 | 설명 |
|------|------|
| `src/components/preview/ReportPreviewWorkspace.tsx` | `confirm_sheet` kind 레이블 "확인서" 정의됨 |
| `src/components/preview/reports/report-preview-types.ts` | `ReportPreviewKind`에 `'confirm_sheet'` 포함 (주석: future) |

### 1.5 현재 입력 필드 (`ConfirmSheetDraft`)

```
siteId         string   현장 ID
siteName       string   현장명
siteAddress    string   현장 주소
siteManager    string   현장 관리자
companyName    string   업체명 (수신처)
projectName    string   공사명
periodStart    string   공사기간 시작 (YYYY-MM-DD)
periodEnd      string   공사기간 종료 (YYYY-MM-DD)
workDate       string   작업일 (YYYY-MM-DD)
workContent    string   작업내용 (직접 입력 또는 일지 자동 채움)
specialNotes   string   특기사항
affiliation    string   소속
signerName     string   성명
signatureDataUrl string | null  서명 이미지 (PNG dataURL)
createdAt      string   ISO timestamp
updatedAt      string   ISO timestamp
```

### 1.6 현재 PDF/다운로드 기능

`confirm-sheet/page.tsx`의 `generatePDF` 함수가 inline으로 구현됨:

```
동작:
1. jsPDF 인스턴스 생성 (unit: mm, format: a4)
2. Helvetica 폰트만 사용 (한글 미지원)
3. 텍스트 레이아웃을 mm 좌표로 수동 계산
4. signatureDataUrl이 있으면 addImage()로 서명 삽입
5. blob으로 변환 후:
   - supabase.storage.from('documents').upload() — documents 버킷에 저장
   - site_documents 테이블에 INSERT (doc_type: 'confirmation')
   - doc.save()로 브라우저 다운로드
```

**문제점:**
- Helvetica 폰트 사용으로 **한글 텍스트가 PDF에 깨져 표시됨**
- `documents` 버킷에 업로드하지만 `storage_bucket`/`storage_path` 메타데이터 미기록
- `site_documents` 테이블에 저장 (기존 `documents` 테이블과 불일치)
- 서명 이미지를 `addImage()`로 삽입하지만 `helvetica` 폰트 기반이라 위치가 부정확

### 1.7 현재 저장 방식

현재 저장 로직은 다음 3단계를 수행:

```
Step 1: PDF blob 생성 (inline, jsPDF만 사용, 한글 깨짐 문제)
Step 2: documents 버킷에 파일 업로드
         upload path: confirm-sheets/ConfirmSheet_{siteName}_{workDate}_{timestamp}.pdf
Step 3: site_documents 테이블에 INSERT
         필드: site_id, doc_type='confirmation', title, file_path, file_url, ...
         (documents 테이블이 아니라 site_documents 테이블에 저장 — 불일치)
```

**문제점:**
- `documents` 테이블이 아니라 `site_documents` 테이블에 저장 → 문서함이 확인서를 조회 불가
- `storage_bucket`/`storage_path` 미기록 → signed URL preview 불가
- 파일명이 타임스탬프 기반이라 **재저장 시 새 파일로 추가**됨 (덮어쓰기 불가)
- 한글 폰트 미지원으로 PDF 텍스트 깨짐

---

## 2. 현재 PDF Dependency 현황

### 2.1 package.json 직접 의존성

| 라이브러리 | 버전 | 용도 |
|------------|------|------|
| `jspdf` | `^2.5.2` | PDF 생성 (confirm-sheet page, photo-sheet-pdf) |

### 2.2 Transitive dependency (package-lock.json)

| 라이브러리 | 버전 | 용도 |
|------------|------|------|
| `html2canvas` | `1.0.0-rc.5` | photo-sheet-pdf.ts에서만 사용 (confirm-sheet 미사용) |

### 2.3 local vendor / CDN 의존성

```
public/ 디렉토리에 PDF 관련 파일 없음
CDN 의존 없음 (html2canvas는 npm package로만 사용)
```

### 2.4 html2canvas/jsPDF 사용 현황 정리

| 파일 | jsPDF | html2canvas | 동적 import |
|------|-------|-------------|-------------|
| `confirm-sheet/page.tsx` | O (inline) | X | O (`await import('jspdf')`) |
| `photo-sheet-pdf.ts` | O | O | O (둘 다) |

### 2.5 한글 PDF 렌더링 전략

**photo-sheet-pdf.ts에서 이미 검증된 방식:**
```
1. 임시 iframe 생성 (화면에 보이지 않음)
2. iframe 내부에 HTML로 콘텐츠 렌더링 (Korean-safe font: Malgun Gothic, Apple SD Gothic Neo)
3. iframeDoc.fonts.ready로 폰트 로드 대기
4. html2canvas로 iframe 내부 캡처 (scale: 2, JPEG quality: 0.95)
5. jsPDF에 이미지として挿入
6. iframe 제거
```

**confirm-sheet/page.tsx에서 현재 방식:**
```
1. jsPDF 텍스트 메서드로 직접 레이아웃 (helvetica 폰트 — 한글 깨짐)
2. signatureDataUrl 있으면 addImage()로 서명 삽입
3. blob output → download
```

**결론:** confirm-sheet PDF 생성方式是 photo-sheet-pdf.ts와 동일한 iframe + html2canvas 방식으로 교체 필요.

---

## 3. 현재 documents 저장 구조

### 3.1 documents page (`src/app/(app)/documents/page.tsx`)

| 항목 | 내용 |
|------|------|
| 라우트 | `/documents` |
| 접근 역할 | worker, partner, site_manager, admin |
| 검색 | `useMenuSearch({ scope: 'documents' })` |
| 카테고리 필터 | 전체, 일지보고서, 사진대지, 도면마킹, 안전서류, 견적서, 시공계획서, 장비계획서, **기타서류, 확인서** |
| 승인 필터 | 전체, 승인완료, 승인대기, 반려 (사진대지만 해당) |
| partner 필터 | 사진대지 중 approved/locked만 표시 |

**DocumentRow 필드:**
```typescript
id, site_id, category, title, file_url, file_type,
created_at, storage_bucket, storage_path,
source_type, source_id, approval_status, locked_at
```

### 3.2 Preview URL 생성 로직

documents page의 `resolvePreviewUrl()` 함수가确立了signed URL 우선 구조:

```
1. storage_bucket + storage_path 있으면 → createSignedPreviewUrl() 시도
   - 성공 → signed URL 사용
   - 실패 → file_url fallback
2. storage_bucket/storage_path 없으면 → file_url 직접 사용
3. 둘 다 없으면 → 에러 메시지
```

### 3.3 file_url fallback 구조

documents page 코드:
```
if (signedUrl) setPreviewUrl(signedUrl)
else if (doc.file_url) setPreviewUrl(doc.file_url)
else setPreviewUrlError('문서 미리보기를 불러오지 못했습니다.')
```

`photo-sheet-document.ts`의 주석:
```
"file_url is kept for backward compatibility with existing documents UI.
 storage_bucket/storage_path are metadata for future signed URL preview/download."
```

### 3.4 storage_bucket/storage_path 사용 여부

| 테이블 | storage_bucket | storage_path | file_url |
|--------|---------------|--------------|----------|
| documents | O | O | O (legacy fallback) |
| site_documents (현재 확인서 저장) | X | X | O (직접 URL만) |

**문제:** 현재 확인서 저장 로직이 `site_documents` 테이블에 저장하고 있어서 `documents` 테이블의 signed URL 구조와 호환되지 않음.

### 3.5 document category/source_type 구조

`documents` 테이블의 category CHECK constraint:
```
('일지보고서','사진대지','도면마킹','안전서류','견적서','시공계획서','장비계획서','기타서류','확인서')
```

확인서의 category는 `'확인서'`로 지정됨.

`photo-sheet-document.ts`의 source_type 예시: `'photo_sheet'`
확인서는 현재 `site_documents` 테이블에 저장되므로 source_type 미지정.

---

## 4. 현재 Storage Helper 구조

### 4.1 함수 목록 (`src/lib/storage/storage-helper.ts`)

| 함수 | 설명 |
|------|------|
| `buildWorklogMediaStoragePath()` | worklog media storage path 생성 (pure function) |
| `buildWorklogMediaStorageTarget()` | bucket + path 통합 반환 |
| `uploadToStorage()` | Supabase Storage에 blob 업로드 |
| `createSignedPreviewUrl()` | private 버킷 파일의 signed URL 생성 (만료 3600s 기본) |
| `resolvePublicUrl()` | public 버킷 파일의 public URL 생성 |

### 4.2 createSignedPreviewUrl

```typescript
await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
실패 시: null 반환 + console.warn
브라우저 클라이언트만 사용 (service role key 미사용)
```

### 4.3 uploadToStorage

```typescript
supabase.storage.from(bucket).upload(path, blob, { contentType, upsert })
upsert 기본값: true (같은 경로 파일 덮어쓰기 가능)
```

### 4.4 reports 버킷 사용 여부

| 용도 | 버킷 |
|------|------|
| worklog media | photos, drawings, documents |
| photo sheet PDF | reports |
| confirm sheet PDF | documents (현재 — 문제 있음) |

### 4.5 service role key 사용 여부

현재 전체 코드베이스에서 service role key 사용 없음.
모든 Supabase 호출은 browser client (`@supabase/ssr` 기반)만 사용.

---

## 5. 확인서 A4 PDF 구현 가능 설계

### 5.1 ConfirmationFormInput (입력 타입)

기존 `ConfirmSheetDraft`를 그대로 사용하되, PDF 생성 전용 필드를 추가:

```typescript
// src/lib/confirmation/types.ts (새 파일)
export interface ConfirmationFormInput {
  siteId: string
  siteName: string
  siteAddress: string
  siteManager: string
  companyName: string
  projectName: string
  periodStart: string
  periodEnd: string
  workDate: string
  workContent: string
  specialNotes: string
  affiliation: string
  signerName: string
  signatureDataUrl: string | null
}
```

### 5.2 ConfirmationA4PdfTemplate

기존 `ConfirmSheetPdfTemplate.tsx`를 그대로 사용 (A4 한글 렌더링 검증됨).
`showPlaceholder` prop으로 draft preview와 실제 PDF 모두 대응.

### 5.3 ConfirmationFormSnapshot (스냅샷 타입)

```typescript
// PDF 생성 직전 입력값 스냅샷 (documents row의 metadata로 저장 가능)
export interface ConfirmationFormSnapshot {
  formId: string
  siteId: string
  workDate: string
  createdAt: string
  input: ConfirmationFormInput
  // 저장 시점의 입력값을 보존하여 재현 가능
}
```

### 5.4 PDF 저장 경로 제안

```
reports/{siteKey}/{workDate}/confirmation/{formId}.pdf
```

예시:
```
reports/site-abc-123/2024-01-15/confirmation/confirmation-abc-123-2024-01-15.pdf
```

**storage path helper 예시:**
```typescript
// src/lib/confirmation/path.ts (새 파일)
export function buildConfirmationStoragePath(input: {
  siteId: string
  workDate: string
  formId: string
}): string {
  return `${sanitizePath(siteId)}/${workDate}/confirmation/${formId}.pdf`
}
```

### 5.5 documents 등록 방식

기존 `photo-sheet-document.ts` 패턴을 따름:

```typescript
// src/lib/confirmation/document.ts (새 파일)
await supabase.from('documents').insert({
  site_id: siteId,
  category: '확인서',  // documents category CHECK constraint 허용
  title: `${siteName} 작업완료확인서 (${workDate})`,
  file_url: fileUrl,  // legacy fallback
  file_type: 'application/pdf',
  uploaded_by: userId,
  storage_bucket: 'reports',
  storage_path: storagePath,
  source_type: 'confirmation',  // 확인서 고유 source_type
  source_id: formId,  // 확인서 form ID로 deduplication
})
```

### 5.6 PreviewCenter 연결 방식

documents page의 기존 구조를 활용:

```
1. documents 테이블에 확인서 저장
2. documents page 카테고리 '확인서' 선택 시 목록 표시
3. 클릭 → signed URL 생성 → iframe preview
4. iframe 내부 PDF 렌더러가 signed URL로 파일 로드
```

**주의:** iframe PDF viewer가 signed URL을 렌더링하려면:
- `PreviewCenter`의 iframe src에 signed URL 전달
- 또는 `reports` 버킷을 public으로 전환 (Storage policy 변경 필요 — 이번 PR에서 미수행)

### 5.7 작업일지 첨부 방식

**이번 구현에서 작업일지 첨부 없음.**
"확인서는 자동 보고서가 아니다" 원칙 적용.

---

## 6. Supabase 테이블 필요성 분석

### 6.1 documents 테이블

**존재 여부:** O (migration 001_initial.sql)

**documents 테이블에 확인서 저장 가능 여부:** O (1차 구현 충분)

documents 테이블의 category CHECK constraint에 `'확인서'`가 포함되어 있어 별도 migration 없이 저장 가능.

### 6.2 site_documents 테이블

**존재 여부:** X (DB migration에 site_documents 테이블 없음)

현재 확인서 저장 코드가 `site_documents` 테이블에 INSERT하려 하지만, 해당 테이블이 존재하지 않음. 실제 동작 시 DB 오류 발생 가능.

**해결:** `documents` 테이블에만 저장하고 `site_documents` 테이블은 사용하지 않음.

### 6.3 confirmation_forms 테이블 필요성

**결론:** 1차 구현에서는 `documents` 테이블만 사용. confirmation_forms 테이블은 **사후 고려**.

| 고려 사항 | 분석 |
|----------|------|
| 저장 시점 입력값 보존 | `documents.metadata` JSONB 컬럼 활용 가능 (확인 필요) |
| 재편집 (draft → saved) | documents의 `source_id`로 draft/saved 구분 가능 |
| version 관리 | 1차 구현에서 미고려 |

### 6.4 document_shares 테이블

**존재 여부:** X

공유 기능은 별도 테이블 필요. 1차 구현에서 documents 테이블의 기존 RLS 정책만으로 관리.

### 6.5 다음 PR에서 migration 필요 여부

| 단계 | migration 필요 여부 |
|------|-------------------|
| PDF 생성 로직 분리 | X (순수 TS 함수 추가만) |
| documents 테이블에 저장 | X (기존 테이블 사용) |
| Storage path helper 추가 | X (순수 TS 함수 추가만) |
| 공유 기능 (PR #70) | O (`document_shares` 테이블 또는 `documents`에 공유 필드 추가) |

---

## 7. 권한/RLS 분석

### 7.1 현재 documents 테이블 RLS 정책 (001_initial.sql)

```sql
-- documents_read
auth.uid() = uploaded_by
OR EXISTS (workers.role IN ('admin','site_manager'))
OR EXISTS (partner + allowed_companies)

-- documents_write
auth.uid() = uploaded_by
OR EXISTS (workers.role = 'admin','site_manager')
```

### 7.2 확인서 권한 예상

| 역할 | 확인서 접근 | 저장 | 수정 | 삭제 | 공유 |
|------|------------|------|------|------|------|
| worker | O | O (본인) | O (본인, draft) | O (본인) | 향후 구현 |
| partner | O | X | X | X | 향후 구현 |
| site_manager | O | O | O | O | 향후 구현 |
| admin | O | O | O | O | O |
| production_manager | X | X | X | X | X |

**주의:** confirm-sheet 라우트 자체는 worker/partner/site_manager/admin 모두 접근 가능. documents 테이블 RLS와 별개로 documents page에서 partner는 확인서를 조회할 수 있어야 함.

### 7.3 partner 공유 범위

현재 documents RLS 정책에서 partner는 `allowed_companies` 기반 site에 속한 문서만 조회 가능. 확인서도 동일한 정책 적용.

### 7.4 locked/locked_at 지원

documents 테이블에 `locked_at` 필드가 있음 (migration 005_documents_approval.sql). 확인서 저장 시 `locked_at` 미설정으로 기본값 null 유지. 잠금 기능은 향후 구현.

---

## 8. Storage Path 제안

### 8.1 확인서 PDF 저장 경로

```
reports/{siteId}/{workDate}/confirmation/{formId}.pdf
```

**예시:**
```
reports/abc-site-123/2024-01-15/confirmation/confirmation-abc-site-123-2024-01-15.pdf
```

### 8.2 확인서 스냅샷 JSON 경로 (선택적)

```
reports/{siteId}/{workDate}/confirmation/{formId}_snapshot.json
```

용도: PDF 생성 시점의 입력값 보존. 1차 구현에서는 documents 테이블의 metadata 활용으로 대체 가능.

### 8.3 서명 이미지 저장 경로 (선택적)

```
reports/{siteId}/{workDate}/confirmation/{formId}_signature.png
```

용도: 서명 이미지를 PDF에 포함. 1차 구현에서는 dataURL을 PDF 생성 시 직접 사용하므로 불필요.

### 8.4 site_documents 테이블 사용 중단

현재 코드에서 `supabase.storage.from('documents').upload(...)` 사용 중.
**변경:** `reports` 버킷 사용으로 변경 (`supabase.storage.from('reports').upload(...)`).

### 8.5 기존 documents 버킷의 confirm-sheets 경로

현재 코드: `documents/confirm-sheets/ConfirmSheet_{...}.pdf`
**문제:** documents 버킷의 용도와 혼재, storage_bucket/storage_path 미기록.

**변경:** reports 버킷의 confirmation 경로로 통일.

---

## 9. 구현 PR 분해안

### PR #66: 확인서 타입/Storage path helper/스냅샷 추가

```
신규 파일:
- src/lib/confirmation/types.ts        (ConfirmationFormInput, ConfirmationFormSnapshot)
- src/lib/confirmation/path.ts         (buildConfirmationStoragePath, buildConfirmationSourceId)
- src/lib/confirmation/index.ts        (barrel export)

변경 파일:
- 없음 (기능 연결 없음)

검증:
- npm run type-check
- npm run build
```

### PR #67: 기존 확인서 입력 화면에 A4 preview wrapper 연결

```
변경 파일:
- src/components/confirm-sheet/ConfirmSheetPdfTemplate.tsx (기존 — 수정 없음)
- src/app/(app)/confirm-sheet/page.tsx (미리보기 탭의 ConfirmSheetPdfTemplate 사용 강화)

신규 파일:
- 없음

주의:
- 기존 UI 유지
- PreviewCenter wrapper 연결만 (PreviewCenter는 이미 사용 중)
- PDF 생성 로직은 여전히 inline
```

### PR #68: PDF 생성 + local download (html2canvas 방식)

```
변경 파일:
- src/app/(app)/confirm-sheet/page.tsx (generatePDF 함수를 photo-sheet-pdf.ts 패턴으로 교체)

신규 파일:
- src/lib/confirmation/pdf.ts  (createConfirmationPdfBlob, downloadConfirmationPdf)

변경 내용:
- iframe + html2canvas + jsPDF 방식으로 교체
- Helvetica → Korean-safe font (Malgun Gothic, Apple SD Gothic Neo)
- PDF 다운로드만 (Storage 저장 없음)

검증:
- 한글 PDF 깨짐 없이 생성되는지 수동 확인
- local download 정상 동작 확인
```

### PR #69: PDF Storage 저장 + documents row 등록

```
변경 파일:
- src/app/(app)/confirm-sheet/page.tsx (generatePDF → Storage 저장 + documents INSERT 추가)

신규 파일:
- src/lib/confirmation/document.ts  (saveConfirmationPdfToStorageAndCreateDocument)

변경 내용:
- reports 버킷에 PDF 저장 (storage_path: reports/{siteId}/{workDate}/confirmation/{formId}.pdf)
- documents 테이블에 INSERT (category: '확인서', source_type: 'confirmation')
- site_documents 테이블 INSERT 코드 제거
- file_url legacy 필드 기록
- storage_bucket/storage_path 메타데이터 기록

검증:
- documents page '확인서' 카테고리에 확인서 목록 표시 확인
- signed URL preview 정상 동작 확인
- documents 버킷의 confirm-sheets 경로 대신 reports 버킷 사용 확인
```

### PR #70: 공유 링크 / document_shares / 권한 보강

```
변경 파일 (예시):
- supabase/migrations/009_documents_sharing.sql (document_shares 테이블 또는 documents 테이블 공유 필드)
- src/lib/confirmation/document.ts 또는 새로운 src/lib/confirmation/share.ts
- src/app/(app)/documents/page.tsx (공유 버튼 추가 — 기존 UI 수정)

주의:
- partner 공유 범위 결정 필요
- signed URL vs public URL 정책 결정 필요
- documents RLS 정책 보강 필요
```

---

## 10. 위험 요소

### 10.1 한글 PDF 깨짐

**위험:** 현재 confirm-sheet/page.tsx의 jsPDF inline 구현이 Helvetica 폰트만 사용하여 한글 깨짐 발생.

**대응:** photo-sheet-pdf.ts의 iframe + html2canvas 방식 적용. Malgun Gothic, Apple SD Gothic Neo 폰트로 렌더링.

**검증 방법:** 생성된 PDF에서 현장명, 공사명, 작업내용 등 한글 텍스트가 정상 표시되는지 수동 확인.

### 10.2 html2canvas/jsPDF 용량 문제

**위험:** html2canvas + jsPDF 조합이 브라우저 메모리를 많이 사용. 모바일에서 OOM 가능성.

**대응:**
- scale: 2 대신 scale: 1.5 고려 (품질 vs 성능 trade-off)
- iframe 크기를 정확히 A4 크기로 제한
- 비동기 처리로 UI 블로킹 방지

### 10.3 Mobile A4 preview overflow

**위험:** ConfirmSheetPdfTemplate이 maxWidth: '210mm'로 설정되어 있어 모바일에서 overflow 가능.

**현재:** `overflow-x-auto` 클래스로 가로 스크롤 처리 중. 이 패턴 유지.

### 10.4 Signature image 저장/보안

**위험:** 서명 이미지가 PNG dataURL로 canvas에 저장. 브라우저 memory에만 존재.

**현재 구현:** `ConfirmSheetSignaturePad`가 canvas를 PNG dataURL로 출력. 이것을 PDF에 직접 embed.

**향후 고려:** 서명 이미지를 별도 Storage에 저장할 경우 storage policy 설정 필요.

### 10.5 Public/private bucket 정책

**위험:** `reports` 버킷이 public이면 signed URL 불필요. private이면 documents page의 preview가 signed URL을 사용해야 함.

**현재:** photo-sheet-document.ts의 주석에서 "If reports bucket becomes private, documents UI must be updated to use signed URLs"라고 언급. 이 이슈는 photo-sheet와 confirm-sheet 모두에 동일 적용.

**결정 필요:** 확인서 PDF도 photo-sheet와 동일한 정책 적용.

### 10.6 file_url legacy fallback

**위험:** documents 테이블의 file_url 필드가 legacy fallback으로 남음. 확인서 저장 시 file_url도 같이 기록해야 documents page의 기존 fallback 로직과 호환됨.

**대응:** `saveConfirmationPdfToStorageAndCreateDocument`에서 file_url도 같이 기록.

### 10.7 Partner 공유 범위

**위험:** 확인서를 partner에게 공유할 때, 현재 documents RLS 정책이 partner의 `allowed_companies` 기반. 확인서 저장 시 site의 `allowed_companies` 설정이 올바른지 확인 필요.

### 10.8 confirmation_forms migration 필요 여부

**위험:** 1차 구현에서는 documents 테이블만 사용. 하지만 확인서 고유의 draft/saved/locked 상태 관리가 documents 테이블만으로 충분한지 불확실.

**대응:** 1차 구현 후 실제 사용 패턴을 보고 confirmation_forms 테이블 필요성 재평가.

---

## 11. 다음 PR 권장안

### 가장 안전한 다음 PR: **PR #66**

**이유:**
1. 기능 연결 없이 순수 타입/헬퍼 함수만 추가하므로 **위험이 가장 낮음**
2. 코드베이스의 photo-sheet-document.ts, photo-sheet-path.ts 패턴을 그대로 따름
3. type-check/build만으로 검증 가능 (수동 테스트 불필요)
4. 이후 PR #67~69에서 이 헬퍼를 가져다 쓰는 구조이므로 **선행 의존성이 명확함**

### PR #66 구현 내용 요약

```
1. src/lib/confirmation/types.ts
   - ConfirmationFormInput (ConfirmSheetDraft에서 파생)
   - ConfirmationFormSnapshot (입력값 보존용)

2. src/lib/confirmation/path.ts
   - sanitizeConfirmationPathSegment (path 안전화)
   - buildConfirmationSourceId (source_id 생성: 'confirmation:{siteId}:{workDate}')
   - buildConfirmationStoragePath (reports 버킷 경로)
   - buildConfirmationDownloadFilename (파일명)

3. src/lib/confirmation/index.ts
   - barrel export

주의:
- Supabase 호출 없음
- Storage 업로드 없음
- documents 테이블 접근 없음
- 기존 코드 수정 없음
```

### 이후 PR #67 권장 (A4 preview wrapper 강화)

기존 확인서 화면의 PreviewCenter + ConfirmSheetPdfTemplate 연결을 점검. 기존 코드를 그대로 사용하되, PDF 생성 로직 분리 전 확인서 A4 미리보기가 정상 동작하는지 검증.

---

## 부록 A. 현재 site_documents 테이블 참조 문제

현재 `confirm-sheet/page.tsx`의 `generatePDF` 함수에서 다음 코드가 실행됨:

```typescript
const { data: docData, error: docError } = await supabase
  .from('site_documents')
  .insert({
    site_id: draft.siteId,
    doc_type: 'confirmation',
    // ...
  })
```

하지만 migration 파일에 `site_documents` 테이블이 존재하지 않음.
이 코드는 **현재도 이미 오류를 발생시킬 가능성이 높음**.

documents 테이블에만 저장하고 `site_documents` 테이블은 사용하지 않아야 함.

---

## 부록 B. documents 테이블 category CHECK constraint

`001_initial.sql`의 documents 테이블 정의:

```sql
category TEXT NOT NULL
  CHECK (category IN ('일지보고서','사진대지','도면마킹','안전서류',
                       '견적서','시공계획서','장비계획서','기타서류','확인서'))
```

`'확인서'`가 CHECK constraint에 포함되어 있어 별도 migration 없이 documents 테이블에 확인서를 저장할 수 있음.

---

## 부록 C. photo-sheet-pdf.ts vs confirm-sheet PDF 비교

| 항목 | photo-sheet-pdf.ts | confirm-sheet/page.tsx |
|------|--------------------|------------------------|
| PDF 생성 방식 | iframe + html2canvas + jsPDF | jsPDF 텍스트만 (inline) |
| 한글 지원 | O (Korean-safe font) | X (Helvetica) |
| 이미지 임베드 | O (signed URL → dataURL) | O (dataURL만) |
| Storage 저장 | O (reports 버킷) | O (documents 버킷) |
| documents 테이블 기록 | O (storage_bucket/path 포함) | X (site_documents에 저장, 불일치) |
| dynamic import | O | O |
| 스냅샷 | photo-sheet-mapping.ts에 정의 | 미정의 |
| path helper | photo-sheet-path.ts에 정의 | 미정의 |

**결론:** confirm-sheet PDF 생성 로직은 photo-sheet-pdf.ts의 구조를 참조하여 전면 개편 필요.
