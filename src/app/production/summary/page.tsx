import { BarChart3, CalendarRange, FileSpreadsheet, PackageSearch, Rows3 } from 'lucide-react'

const fieldClassName =
  'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed disabled:bg-[var(--color-bg)] disabled:text-[var(--color-text-secondary)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

const kpiCards = [
  '생산 수량',
  '판매 수량',
  '자체사용 수량',
  '재고조정 건수',
  '운송비 입력 건수',
]

const futureColumns = ['품목명', '전월 재고', '생산', '판매', '자체사용', '조정', '예상 재고']

export default function ProductionSummaryPage() {
  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--active-role-color)]">
            <BarChart3 className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              Production Summary
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text)]">생산 요약</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              생산, 판매, 자체사용, 운송비, 재고조정 흐름을 월별로 요약하는 화면입니다. 현재는 정적
              UI이며 실제 집계는 후속 PR에서 연결될 예정입니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
            <h2 className="text-base font-semibold text-[var(--color-text)]">요약 기준</h2>
          </div>

          <span className="inline-flex w-fit items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
            필터 연결 준비 중
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClassName}>
            기준 월
            <input type="month" className={fieldClassName} defaultValue="2026-04" disabled />
          </label>

          <label className={labelClassName}>
            품목
            <input
              type="text"
              className={fieldClassName}
              placeholder="품목 선택 준비 중"
              defaultValue=""
              disabled
            />
          </label>

          <label className={labelClassName}>
            현장/거래처
            <select className={fieldClassName} defaultValue="" disabled>
              <option value="">전체 현장/거래처</option>
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
        </div>

        <p className="mt-4 text-xs leading-5 text-[var(--color-text-secondary)]">
          현재 필터는 화면 구조 확인용입니다. 실제 월별 집계와 조건 반영은 후속 PR에서 연결됩니다.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Rows3 className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
          <h2 className="text-base font-semibold text-[var(--color-text)]">요약 지표</h2>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpiCards.map((title) => (
            <div
              key={title}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
            >
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">{title}</p>
              <p className="mt-3 text-2xl font-bold text-[var(--color-text)]">-</p>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">실제 집계 연결 예정</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <PackageSearch className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
          <h2 className="text-base font-semibold text-[var(--color-text)]">제품별 이동 요약</h2>
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-5">
          <p className="text-sm font-semibold text-[var(--color-text)]">아직 집계 표가 연결되지 않았습니다.</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            제품별 이동 요약은 후속 PR에서 월별 생산 데이터와 재고 흐름 정의를 확정한 뒤 연결합니다.
            이번 단계에서는 표시될 컬럼 구조만 먼저 정리합니다.
          </p>

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
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
          <h2 className="text-base font-semibold text-[var(--color-text)]">월마감 및 보고서 안내</h2>
        </div>

        <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          <p>월별 재고 보고서, 엑셀/PDF 출력, 월마감 잠금 기능은 별도 PR에서 처리합니다.</p>
          <p>이번 PR은 생산 요약 화면의 정적 대시보드 구조만 확정하는 범위로 제한합니다.</p>
        </div>
      </section>
    </div>
  )
}
