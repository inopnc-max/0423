'use client'

import { History, ListFilter } from 'lucide-react'
import { ProductionRecentEntries } from '@/components/production/ProductionRecentEntries'
import { useProductionDashboard } from '@/hooks/production/useProductionDashboard'

const fieldClassName =
  'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed disabled:bg-[var(--color-bg)] disabled:text-[var(--color-text-secondary)]'

const labelClassName = 'text-sm font-medium text-[var(--color-text)]'

export default function ProductionLogsPage() {
  const { records, loading, error } = useProductionDashboard()

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
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text)]">생산 내역</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              생산관리 입력 내역을 확인합니다. 현재는 최근 내역 중심으로 표시하고, 정교한 조건 검색은 후속 단계에서 연결합니다.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
            <h2 className="text-base font-semibold text-[var(--color-text)]">조회 조건</h2>
          </div>

          <span className="inline-flex w-fit items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
            최근 {records?.recentEntries.length ?? 0}건
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClassName}>
            기간
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input type="date" className={fieldClassName} disabled />
              <input type="date" className={fieldClassName} disabled />
            </div>
          </label>

          <label className={labelClassName}>
            구분
            <select className={fieldClassName} defaultValue="" disabled>
              <option value="">전체 구분</option>
              <option value="생산">생산</option>
              <option value="판매">판매</option>
              <option value="자체사용">자체사용</option>
              <option value="운송비">운송비</option>
            </select>
          </label>
        </div>
      </section>

      <ProductionRecentEntries entries={records?.recentEntries ?? []} loading={loading} />
    </div>
  )
}
