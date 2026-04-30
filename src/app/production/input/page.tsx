import { ClipboardList, Database, Save } from 'lucide-react'

const fieldClassName =
  'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--active-role-color)] focus:ring-2 focus:ring-[var(--active-role-color)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

export default function ProductionInputPage() {
  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--active-role-color)]">
            <ClipboardList className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              Production Input
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text)]">생산 입력</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              생산 실적과 투입 정보를 정리할 정적 입력 폼입니다. 현재 화면은 입력 구조 확인용이며,
              저장 연결은 후속 PR에서 진행됩니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
          <h2 className="text-base font-semibold text-[var(--color-text)]">생산 입력 폼</h2>
        </div>

        <form className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClassName}>
              작업일
              <input type="date" className={fieldClassName} defaultValue="2026-04-30" />
            </label>

            <label className={labelClassName}>
              현장
              <select className={fieldClassName} defaultValue="" disabled>
                <option value="">현장 선택은 후속 연결 예정</option>
              </select>
            </label>

            <label className={labelClassName}>
              구분
              <select className={fieldClassName} defaultValue="생산">
                <option value="생산">생산</option>
                <option value="판매">판매</option>
                <option value="자체사용">자체사용</option>
                <option value="운송비">운송비</option>
              </select>
            </label>

            <label className={labelClassName}>
              품목명
              <input
                type="text"
                className={fieldClassName}
                placeholder="예: 콘크리트 블록"
                defaultValue=""
              />
            </label>

            <label className={labelClassName}>
              수량
              <input type="number" className={fieldClassName} placeholder="0" min="0" defaultValue="" />
            </label>

            <label className={labelClassName}>
              단위
              <input type="text" className={fieldClassName} defaultValue="개" />
            </label>

            <label className={labelClassName}>
              금액
              <input type="number" className={fieldClassName} placeholder="0" min="0" defaultValue="" />
            </label>
          </div>

          <label className={labelClassName}>
            메모
            <textarea
              className={`${fieldClassName} min-h-28 resize-y`}
              placeholder="작업 메모, 비고, 특이사항 등을 정리합니다."
              defaultValue=""
            />
          </label>
        </form>
      </section>

      <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">저장 준비 상태</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              production_entries 테이블은 준비되었고, 저장 연결은 후속 PR에서 진행됩니다.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white opacity-60 md:w-auto"
          >
            <Save className="h-4 w-4" strokeWidth={1.9} />
            저장 기능 준비 중
          </button>
        </div>
      </section>
    </div>
  )
}
