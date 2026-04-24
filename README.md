# INOPNC V2 App

통합앱 빌드 프로젝트 (Phase A)

## 설정

1. `.env.local` 파일 생성 (실제 Supabase 키 입력)
2. `npm install`
3. `npm run dev`

## Supabase DB 설정

1. Supabase SQL Editor에서 `supabase/migrations/001_initial.sql` 실행
2. `supabase/migrations/002_csv_upload.sql` 실행
3. Authentication > Providers > Email 활성화

## 참고

- roles.ts, routes.ts는 SSOT (Single Source of Truth)입니다.
- 역할 변경 시 이 파일만 수정하세요.


