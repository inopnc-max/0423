'use client'

import { ClipboardList } from 'lucide-react'
import { ProductionEntryDraftForm } from '@/components/production/ProductionEntryDraftForm'
import { ProductionRecentEntries } from '@/components/production/ProductionRecentEntries'
import { useProductionDashboard } from '@/hooks/production/useProductionDashboard'
import { type ProductionEntrySaveInput } from '@/lib/production/productionRecords'

export default function ProductionInputPage() {
  const { records, loading, error, reload, saveEntry, currentUserId } = useProductionDashboard()

  const handleSave = async (input: ProductionEntrySaveInput) => {
    await saveEntry(input)
    await reload()
  }

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
              생산 실적과 판매, 자체사용, 운송비 입력을 저장합니다. 저장 후 최근 내역과 요약이 자동으로 갱신됩니다.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {currentUserId && (
        <ProductionEntryDraftForm
          sites={records?.sites ?? []}
          products={records?.products ?? []}
          clients={records?.clients ?? []}
          currentUserId={currentUserId}
          onSave={handleSave}
        />
      )}

      <ProductionRecentEntries entries={records?.recentEntries ?? []} loading={loading} />
    </div>
  )
}
