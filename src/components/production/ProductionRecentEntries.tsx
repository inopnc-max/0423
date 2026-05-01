import { Clock3, PackageOpen } from 'lucide-react'
import type { ProductionRecentEntry } from '@/lib/production/productionRecords'

function formatQuantity(entry: ProductionRecentEntry): string {
  const quantity = new Intl.NumberFormat('ko-KR').format(entry.quantity)
  return [quantity, entry.unit].filter(Boolean).join(' ')
}

function formatAmount(value: number): string {
  if (value <= 0) return '-'
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value)
}

export function ProductionRecentEntries({
  entries,
  loading = false,
}: {
  entries: ProductionRecentEntry[]
  loading?: boolean
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-[var(--active-role-color)]" strokeWidth={1.9} />
        <h2 className="text-base font-semibold text-[var(--color-text)]">최근 생산 내역</h2>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
            생산 내역을 불러오는 중입니다.
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
            등록된 생산 내역이 없습니다.
          </div>
        ) : (
          entries.map(entry => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg)] text-[var(--active-role-color)]">
                <PackageOpen className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{entry.productName}</span>
                <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">
                  {[entry.workDate, entry.siteName, entry.createdByName].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold text-[var(--color-text)]">{formatQuantity(entry)}</span>
                <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                  {entry.type} · {formatAmount(entry.amount)}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
