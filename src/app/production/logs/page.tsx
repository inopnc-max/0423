import { Clock3, History, ListFilter, SearchX } from 'lucide-react'

const fieldClassName =
  'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed disabled:bg-[var(--color-bg)] disabled:text-[var(--color-text-secondary)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

const futureColumns = ['일자', '구분', '품목명', '수량', '단위', '현장/거래처', '작성자', '상태']

export default function ProductionLogsPage() {
  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--active-role-color)]">
            <History className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              Production Logs
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text)]">생산 이력</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              생산, 판매, 자체사용, 운송비, 재고조정 내역을 확인하는 화면입니다. 현재는 정적 UI만
              구성되어 있으며 실제 조회 기능은 후속 PR에서 연결될 예정입니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
            <h2 className="text-base font-semibold text-[var(--color-text)]">조회 조건</h2>
          </div>

          <span className="inline-flex w-fit items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
            조회 기능 준비 중
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClassName}>
            기간
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input type="date" className={fieldClassName} defaultValue="2026-04-01" disabled />
              <input type="date" className={fieldClassName} defaultValue="2026-04-30" disabled />
            </div>
          </label>

          <label className={labelClassName}>
            현장
            <select className={fieldClassName} defaultValue="" disabled>
              <option value="">전체 현장</option>
            </select>
          </label>

          <label className={labelClassName}>
            구분
            <select className={fieldClassName} defaultValue="" disabled>
              <option value="">전체 구분</option>
              <option value="생산">생산</option>
              <option value="판매">판매</option>
              <option value="자체사용">자체사용</option>
              <option value="운송비">운송비</option>
              <option value="재고조정">재고조정</option>
            </select>
          </label>

          <label className={labelClassName}>
            품목명
            <input
              type="text"
              className={fieldClassName}
              placeholder="품목명 검색 준비 중"
              defaultValue=""
              disabled
            />
          </label>

          <label className={labelClassName}>
            작성자
            <input
              type="text"
              className={fieldClassName}
              placeholder="작성자 필터 준비 중"
              defaultValue=""
              disabled
            />
          </label>
        </div>

        <p className="mt-4 text-xs leading-5 text-[var(--color-text-secondary)]">
          현재 필터는 화면 구조 확인용입니다. 실제 조건 조회와 결과 반영은 후속 PR에서 연결됩니다.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <SearchX className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
          <h2 className="text-base font-semibold text-[var(--color-text)]">이력 리스트</h2>
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white text-[var(--active-role-color)]">
              <Clock3 className="h-4 w-4" strokeWidth={1.9} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                아직 조회 기능이 연결되지 않았습니다.
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                입력된 생산 데이터 조회는 후속 PR에서 Supabase/RLS 검토 후 연결됩니다. 이번
                화면에서는 이력 리스트 구조와 빈 상태 문구만 먼저 확정합니다.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {futureColumns.map((column) => (
              <div
                key={column}
                className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)]"
              >
                {column}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--color-text)]">후속 작업 안내</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          실제 데이터 조회, 필터링, 엑셀/PDF 출력, 월마감 연동은 별도 PR에서 처리합니다. 이번 PR은
          생산 이력 화면의 UI 구조만 확정하는 범위로 제한합니다.
        </p>
      </section>
    </div>
  )
}
