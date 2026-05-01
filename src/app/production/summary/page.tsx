'use client'

import { BarChart3, FileSpreadsheet, PackageSearch } from 'lucide-react'
import { ProductionSummaryCards } from '@/components/production/ProductionSummaryCards'
import { useProductionDashboard } from '@/hooks/production/useProductionDashboard'

export default function ProductionSummaryPage() {
  const { records, loading, error } = useProductionDashboard()

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
              생산, 판매, 자체사용, 운송비 흐름을 요약합니다. 데이터가 없는 경우에도 빈 상태로 안전하게 표시합니다.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 text-sm text-[var(--color-text-secondary)] shadow-sm">
          생산 요약을 불러오는 중입니다.
        </div>
      ) : records ? (
        <>
          <ProductionSummaryCards summary={records.summary} />

          <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <PackageSearch className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
              <h2 className="text-base font-semibold text-[var(--color-text)]">기준 데이터</h2>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <p className="text-sm text-[var(--color-text-secondary)]">활성 품목</p>
                <p className="mt-2 text-xl font-bold text-[var(--color-text)]">{records.summary.activeProducts}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <p className="text-sm text-[var(--color-text-secondary)]">활성 거래처</p>
                <p className="mt-2 text-xl font-bold text-[var(--color-text)]">{records.summary.activeClients}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <p className="text-sm text-[var(--color-text-secondary)]">최근 입력</p>
                <p className="mt-2 text-xl font-bold text-[var(--color-text)]">{records.summary.totalEntries}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
              <h2 className="text-base font-semibold text-[var(--color-text)]">마감 및 보고서 안내</h2>
            </div>

            <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              <p>월별 재고 보고서 작성, PDF 출력, 마감 잠금 기능은 별도 PR에서 처리합니다.</p>
              <p>이번 보강은 생산관리자 화면의 입력, 내역, 요약 UX와 안전한 읽기 흐름을 정리하는 범위입니다.</p>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
