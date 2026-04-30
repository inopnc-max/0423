# Production Data Model Plan

## 1. 목적

- production_manager 역할의 생산 입력/이력/요약 기능 구현 전 데이터 모델 확정
- migration 전 설계 문서
- 현재 route는 placeholder 상태이며 DB 저장 기능은 없음

## 2. 현재 코드 상태

- `/production/input`
- `/production/logs`
- `/production/summary`
- production layout AppShell 적용
- production_manager role/nav/route-access/middleware 존재
- production 전용 테이블은 아직 없음

## 3. 기능 범위

### 3-1. 생산 입력

포함 후보:

- site_id
- work_date
- product_name
- quantity
- unit
- production_type
  - 생산
  - 판매
  - 자체사용
  - 운송비
- amount
- memo
- created_by

### 3-2. 생산 이력

필터 후보:

- 기간
- 현장
- 구분
- 제품명
- 작성자

### 3-3. 생산 요약

집계 후보:

- 월별 생산량
- 현장별 생산량
- 구분별 금액
- 판매/자체사용/운송비 합계

## 4. Supabase 테이블 후보

후보 테이블:

- production_entries

컬럼 후보:

- id uuid primary key
- site_id uuid references sites(id)
- work_date date not null
- product_name text not null
- production_type text not null
- quantity numeric default 0
- unit text default '개'
- amount integer default 0
- memo text
- created_by uuid references workers(id)
- created_at timestamptz default now()
- updated_at timestamptz default now()

## 5. RLS 초안

작성은 문서 초안만. migration은 만들지 않는다.

원칙:

- production_manager: production_entries select/insert/update 가능
- admin: 전체 가능
- site_manager: select 가능 여부는 정책 결정 필요
- worker/partner: 기본 차단
- delete는 admin만 허용하는 방향 검토

## 6. 기존 테이블과 중복 검토

비교:

- materials
- material_logs
- daily_logs
- billing_docs
- salary_entries

판단:

- material_logs는 자재 입출고용
- daily_logs는 작업일지용
- billing_docs는 청구 문서용
- production_entries는 생산관리 별도 테이블 후보

## 7. 구현 단계 제안

PR 단위:

1. docs/production-data-model-plan
2. migration production_entries
3. production input form static UI
4. production insert API/Supabase 연결
5. production logs list
6. production summary aggregation

## 8. Open Questions

- 생산관리 데이터가 현장 기준인지 회사 기준인지
- product_name을 자유입력으로 둘지 product master 테이블을 둘지
- 판매/자체사용/운송비를 한 테이블의 type으로 둘지 별도 테이블로 나눌지
- amount가 필수인지 선택인지
- site_manager가 조회 가능한지
- partner에게 일부 공개할지
- 엑셀/CSV export 필요 여부

## 9. 다음 PR 조건

다음 PR은 migration 생성 전 아래가 확정되어야 한다:

- production_entries 컬럼
- production_type enum/check 값
- RLS 역할별 접근 정책
- UI 입력 필드
- Dashboard 실제 운영 요구사항
