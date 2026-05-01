'use client'

import { Construction } from 'lucide-react'
import { ProductionRecentEntries } from '@/components/production/ProductionRecentEntries'
import { ProductionSummaryCards } from '@/components/production/ProductionSummaryCards'
import { ProductionWorkflowPanel } from '@/components/production/ProductionWorkflowPanel'
import { useProductionDashboard } from '@/hooks/production/useProductionDashboard'

export default function ProductionPage() {
  const { records, loading, error } = useProductionDashboard()

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--active-role-color)]">
            <Construction className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              Production Manager
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-text)]">생산관리</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              생산, 판매, 자체사용, 운송비 흐름을 입력, 내역, 요약 화면으로 나누어 관리합니다.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {records && <ProductionSummaryCards summary={records.summary} />}

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <ProductionWorkflowPanel />
        <ProductionRecentEntries entries={(records?.recentEntries ?? []).slice(0, 8)} loading={loading} />
      </section>
    </div>
  )
}
